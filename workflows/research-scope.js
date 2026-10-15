export const meta = {
  name: 'research-scope',
  description: 'WIDE discovery: cast a broad net for a topic across all source types (papers, blogs, code, tutorials, courses, docs), dedup URLs + against the vault, judge each, and return a tiered (core / broader) deduped catalog to pick from. Read-only.',
  whenToUse: 'When you want a comprehensive, deduped catalog of everything worth reading on a topic — the front-end to research-decode. Pass the topic as args. Discovery is wide; judging is bounded to protect token budget. Does NOT write notes.',
  phases: [
    { title: 'Scope', detail: 'Decompose topic into source-type angles (papers, blogs, code, tutorials, critiques)' },
    { title: 'Search', detail: 'One agent per angle casts a wide net (fan-out)' },
    { title: 'Judge', detail: 'Dedup first (cheap), then judge only unique sources (economy); tier the results' },
  ],
}

// research-scope: Scope -> parallel Search (wide) -> global URL dedup -> single-pass Judge (tier) -> rank + vault dedup
// Read-only discovery front-end for the research-papers decode skill.
// Topic is passed via Workflow({ name: 'research-scope', args: '<topic>' }).
// Economy: dedup BEFORE judging, and judge the whole list in ONE agent pass (not per-source).

const SOURCES_DIR = "__VAULT__/10_SOURCES"
// Wide discovery, bounded judging. Overlaps are deduped BEFORE judging, so we only
// spend judge-tokens on UNIQUE sources — that's the economy lever (best out of the work).
const MAX_JUDGE = 45        // hard cap on the EXPENSIVE step (judging) — protects token budget
const HITS_PER_ANGLE = 8    // how wide each searcher casts

// ─── Schemas: force agents to return validated JSON, not prose ───
const SCOPE_SCHEMA = {
  type: "object", required: ["topic", "angles"],
  properties: {
    topic: { type: "string" },
    strategy: { type: "string" },
    // Wide: 4-8 angles. Agent self-sizes to the topic (small topic → fewer, big → more).
    angles: { type: "array", minItems: 4, maxItems: 8, items: {
      type: "object", required: ["label", "query"],
      properties: {
        label: { type: "string" },
        query: { type: "string" },
        rationale: { type: "string" },
      },
    }},
  },
}

const SEARCH_SCHEMA = {
  type: "object", required: ["results"],
  properties: {
    results: { type: "array", maxItems: 10, items: {
      type: "object", required: ["url", "title", "type"],
      properties: {
        url: { type: "string" },
        title: { type: "string" },
        type: { enum: ["paper", "blog", "repo", "course", "docs", "other"] },
        snippet: { type: "string" },
      },
    }},
  },
}

// Single-pass judge: one agent tiers the ENTIRE deduped list at once (economy lever).
// Returns one verdict per source, keyed by index into the list it was given.
const JUDGE_SCHEMA = {
  type: "object", required: ["verdicts"],
  properties: {
    verdicts: { type: "array", items: {
      type: "object", required: ["index", "tier", "relevance", "quality", "why"],
      properties: {
        index: { type: "integer" },                       // index into the input list
        tier: { enum: ["core", "broader", "skip"] },      // core=must-read · broader=optional · skip=junk
        relevance: { enum: ["high", "medium", "low"] },
        quality: { enum: ["primary", "high-signal", "secondary", "shallow"] },
        why: { type: "string" },        // one line: why read it (or why skip)
        bestFor: { type: "string" },    // what perspective/understanding it gives
      },
    }},
  },
}

// The script has no filesystem access (per docs: "No direct filesystem or shell
// access from the workflow itself. Agents read, write, and run commands.").
// So an agent does the directory listing and returns it; the script ranks with it.
const VAULT_LIST_SCHEMA = {
  type: "object", required: ["filenames"],
  properties: {
    filenames: { type: "array", items: { type: "string" } },
  },
}

// ─── Phase 0: Scope ───
phase("Scope")
const TOPIC = (typeof args === "string" && args.trim()) || ""
if (!TOPIC) {
  return { error: "No topic provided. Pass it as args: Workflow({ name: 'research-scope', args: '<topic>' })." }
}

const scope = await agent(
  "Decompose this research topic into search angles that together cast a WIDE net — the goal is to discover EVERYTHING worth reading, across all source types.\n\n" +
  "## Topic\n" + TOPIC + "\n\n" +
  "## Task\n" +
  "Generate 4-8 distinct search queries. Cover the full range of SOURCE TYPES, not just one:\n" +
  "- foundational / origin papers\n" +
  "- state-of-the-art & successor papers\n" +
  "- high-signal blogs & explainers (e.g. Lilian Weng, Chris Olah, vendor engineering blogs)\n" +
  "- code / reference implementations (GitHub repos)\n" +
  "- tutorials & courses (hands-on)\n" +
  "- official docs\n" +
  "- critiques / limitations / failure modes\n\n" +
  "Self-size to the topic: a narrow topic needs fewer angles, a big one needs more (up to 8). " +
  "Make queries specific enough to surface real signal, not SEO listicles. Expect overlap between angles — that's fine, it gets deduped.\n\nStructured output only.",
  { label: "scope", phase: "Scope", schema: SCOPE_SCHEMA }
)
if (!scope) return { error: "Scope agent returned nothing — cannot decompose the topic." }
log("Topic: " + TOPIC)
log("Angles: " + scope.angles.map(a => a.label).join(", "))

// ─── List existing vault sources via an agent (script can't touch the FS) ───
const vaultList = await agent(
  "List the existing source notes so we can flag duplicates.\n\n" +
  "Run this exact command with your Bash tool:\n" +
  "`ls \"" + SOURCES_DIR + "\" 2>/dev/null`\n\n" +
  "Return every filename it prints, verbatim, as the `filenames` array. " +
  "If the command errors or prints nothing, return an empty array.\n\nStructured output only.",
  { label: "list-vault", phase: "Scope", schema: VAULT_LIST_SCHEMA }
)
const existingFiles = (vaultList?.filenames || []).map(f => f.toLowerCase())
log("Vault has " + existingFiles.length + " existing source notes")

// ─── URL dedup state (accumulates as searchers complete) ───
const normURL = u => {
  try {
    const p = new URL(u)
    return (p.hostname.replace(/^www\./, "") + p.pathname.replace(/\/$/, "")).toLowerCase()
  } catch { return u.toLowerCase() }
}
const seen = new Map()

const SEARCH_PROMPT = (angle) =>
  "## Source Finder: " + angle.label + "\n\n" +
  "Topic: \"" + TOPIC + "\"\n" +
  "Your angle: **" + angle.label + "** — " + (angle.rationale || "") + "\n" +
  "Search query: `" + angle.query + "`\n\n" +
  "## Task\nUse WebSearch (refine/run a couple of variations to cast a WIDE net). Return up to " + HITS_PER_ANGLE + " valuable sources for LEARNING this topic.\n" +
  "Any type is fine — paper, blog, repo, course, docs. Favor breadth here; junk gets filtered later. But still skip pure SEO listicles and content farms.\n" +
  "Classify each by type and include a short snippet of why it's relevant.\n\nStructured output only."

// ─── Phase 1: Search ALL angles (barrier). Casting wide; we want the full pool before dedup. ───
phase("Search")
const searchResults = (await parallel(
  scope.angles.map(angle => () =>
    agent(SEARCH_PROMPT(angle), { label: "search:" + angle.label, phase: "Search", schema: SEARCH_SCHEMA })
      .then(r => {
        if (!r) return null
        log(angle.label + ": " + r.results.length + " hits")
        return r.results.map(x => ({ ...x, angle: angle.label }))
      })
  )
)).filter(Boolean).flat()

// ─── Global dedup BEFORE judging — this is the economy lever.
//     Overlaps (same source from many angles) collapse for free; we only pay to judge UNIQUES. ───
const unique = []
for (const r of searchResults) {
  const key = normURL(r.url)
  if (seen.has(key)) continue
  seen.set(key, true)
  unique.push(r)
}
const toJudge = unique.slice(0, MAX_JUDGE)   // bound the EXPENSIVE step to protect token budget
log("Found " + searchResults.length + " raw → " + unique.length + " unique → judging " + toJudge.length +
    (unique.length > MAX_JUDGE ? " (capped at MAX_JUDGE=" + MAX_JUDGE + ")" : ""))

if (toJudge.length === 0) {
  return { topic: TOPIC, summary: "No candidates found across " + scope.angles.length + " angles.", sources: [] }
}

// ─── Phase 2: Judge the whole deduped list in ONE pass (no per-source fetch — economy).
//     Deep reading is deferred to research-decode; here we only tier from title/type/snippet. ───
phase("Judge")
const listing = toJudge.map((s, i) =>
  `[${i}] (${s.type}) ${s.title}\n    url: ${s.url}\n    snippet: ${s.snippet || "(none)"}`
).join("\n\n")

const judgment = await agent(
  "## Catalog Judge (single pass)\n\n" +
  "Topic being researched: \"" + TOPIC + "\"\n\n" +
  "Below is a deduped list of " + toJudge.length + " candidate sources. Tier EACH ONE for a reading catalog. " +
  "Do NOT fetch pages — judge from title, type, and snippet (deep reading happens later in decode).\n\n" +
  "## Candidates\n" + listing + "\n\n" +
  "## Task\nReturn one verdict per source (by its [index]):\n" +
  "- tier: **core** (must-read — primary/seminal, or the single best explainer of a facet) · " +
  "**broader** (genuinely useful, optional/supplementary) · **skip** (SEO listicle, thin, paywalled, redundant)\n" +
  "- relevance (high/medium/low) · quality (primary/high-signal/secondary/shallow)\n" +
  "- why: ONE line on why read it (or why skip) · bestFor: what perspective it gives\n\n" +
  "Be honest: few are 'core', most are 'broader', obvious junk is 'skip'. Cover ALL " + toJudge.length + " indices.\n\nStructured output only.",
  { label: "judge-all", phase: "Judge", schema: JUDGE_SCHEMA }
)

if (!judgment || !judgment.verdicts?.length) {
  return { topic: TOPIC, summary: "Judge returned nothing for " + toJudge.length + " candidates.", sources: [] }
}

// Merge verdicts back onto the sources by index; default unscored ones to 'broader' so nothing is silently lost.
const byIndex = new Map(judgment.verdicts.map(v => [v.index, v]))
const candidates = toJudge.map((src, i) => {
  const v = byIndex.get(i) || { tier: "broader", relevance: "medium", quality: "secondary", why: "(not individually judged)", bestFor: "" }
  return { ...src, tier: v.tier, relevance: v.relevance, quality: v.quality, why: v.why, bestFor: v.bestFor }
})

// ─── Flag candidates already in the vault (existingFiles was fetched by the list-vault agent above) ───
const arxivId = u => (u.match(/(\d{4}\.\d{4,5})/) || [])[1] || ""
const inVault = (c) => {
  const id = arxivId(c.url)
  if (id && existingFiles.some(f => f.includes(id))) return true
  const key = c.title.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 3)
  return key.length > 0 && existingFiles.some(f => key.every(k => f.includes(k)))
}

// ─── Rank within tiers: tier first, then relevance, then quality ───
const tierRank = { core: 0, broader: 1, skip: 2 }
const relRank = { high: 0, medium: 1, low: 2 }
const qualRank = { primary: 0, "high-signal": 1, secondary: 2, shallow: 3 }
const ranked = candidates
  .map(c => ({ ...c, alreadyInVault: inVault(c) }))
  .sort((a, b) =>
    (tierRank[a.tier] - tierRank[b.tier]) ||
    (relRank[a.relevance] - relRank[b.relevance]) ||
    (qualRank[a.quality] - qualRank[b.quality])
  )

const core = ranked.filter(c => c.tier === "core" && !c.alreadyInVault)
const broader = ranked.filter(c => c.tier === "broader" && !c.alreadyInVault)
const skipped = ranked.filter(c => c.tier === "skip")
const haveAlready = ranked.filter(c => c.alreadyInVault)
log("Tiers → core: " + core.length + " · broader: " + broader.length + " · skip: " + skipped.length + " · already in vault: " + haveAlready.length)

const shape = c => ({
  title: c.title, url: c.url, type: c.type,
  tier: c.tier, relevance: c.relevance, quality: c.quality,
  alreadyInVault: c.alreadyInVault, why: c.why, bestFor: c.bestFor, angle: c.angle,
})

return {
  topic: TOPIC,
  summary: `${candidates.length} judged · core: ${core.length} · broader: ${broader.length} · skip: ${skipped.length} · already in vault: ${haveAlready.length}.`,
  angles: scope.angles.map(a => a.label),
  // Tiered, deduped catalog. core = decode these first; broader = optional; skipped/haveAlready for transparency.
  core: core.map(shape),
  broader: broader.map(shape),
  skipped: skipped.map(shape),
  alreadyInVault: haveAlready.map(shape),
}
