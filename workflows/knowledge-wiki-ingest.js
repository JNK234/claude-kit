export const meta = {
  name: 'knowledge-wiki-ingest',
  description: 'Ingest 10_SOURCES notes into the Knowledge Wiki: parallel zettel extraction per source, cross-batch dedup barrier, theme clustering, topic-page create/update per cluster, index/log/processed.json, and semantic index rebuild.',
  whenToUse: 'After /research-decode (or for any source notes not yet in .status/processed.json). Args: {sources: ["<10_SOURCES filename>", ...], skipExtract?: true, context?: "<what the batch is about>"}. Use skipExtract when zettels were already extracted for these sources and only dedup + synthesis + navigation remain.',
  phases: [
    { title: 'Setup', detail: 'Tag vocabulary, processed.json check, iCloud stubs, existing topic pages' },
    { title: 'Extract', detail: 'One agent per source: atomic zettels from the body, Key claims and code sections (skipped when skipExtract)' },
    { title: 'Collect', detail: 'skipExtract only: find the zettels already extracted from these sources' },
    { title: 'Dedup', detail: 'Barrier: find same-concept zettels across the batch, merge true duplicates, repoint links' },
    { title: 'Cluster', detail: 'Group new zettels into themes; map each theme to an existing topic page or a new one' },
    { title: 'Synthesize', detail: 'One agent per theme: create or update the topic page (Feynman voice, verified links)' },
    { title: 'Navigate', detail: 'index.md, log.md, processed.json (written last), rebuild the semantic index' },
  ],
}

// knowledge-wiki-ingest — encodes the knowledge-wiki skill's ingest workflow
// (references/ingest-workflow.md) as a fixed pipeline. The script has no FS access;
// agents do all reading and writing.

const VAULT = "__VAULT__"
const SOURCES_DIR = VAULT + "/10_SOURCES"
const ZK = VAULT + "/20_ZETTLEKASTEN"
const TOPICS = VAULT + "/50_MOC/topics"
const ZK_DIR = "__ZK_DIR__"
const SKILL = "__KIT__/plugins/research-vault/skills/knowledge-wiki"

// ─── Args ───
let cfg = args
if (typeof cfg === "string") { try { cfg = JSON.parse(cfg) } catch { cfg = { sources: cfg.split("\n").map(s => s.trim()).filter(Boolean) } } }
if (Array.isArray(cfg)) cfg = { sources: cfg }
const sources = ((cfg && cfg.sources) || []).map(s => s.replace(/^.*10_SOURCES\//, "").replace(/\.md$/, "") + ".md")
const skipExtract = !!(cfg && cfg.skipExtract)
const context = (cfg && cfg.context) || ""
if (!sources.length) return { error: "Pass {sources: [\"<10_SOURCES filename>\", ...]}" }

const RULES =
  "Before writing anything, read " + SKILL + "/SKILL.md (Writing Principles — non-negotiable: Feynman, no jargon without earning it, why not just what, preserve necessary complexity, no filler, technical depth, source-first) and " + SKILL + "/references/formats.md (exact zettel and topic formats).\n"

// ─── Schemas ───
const SETUP_SCHEMA = { type: "object", required: ["tags", "toProcess", "topics"], properties: {
  tags: { type: "array", items: { type: "string" } },
  toProcess: { type: "array", items: { type: "string" } },
  alreadyProcessed: { type: "array", items: { type: "string" } },
  missing: { type: "array", items: { type: "string" } },
  icloudStubs: { type: "number" },
  topics: { type: "array", items: { type: "string" } },
} }
const EXTRACT_SCHEMA = { type: "object", required: ["source", "created"], properties: {
  source: { type: "string" },
  created: { type: "array", items: { type: "string" } },
  reused: { type: "array", items: { type: "string" } },
  keyLearning: { type: "string" },
} }
const COLLECT_SCHEMA = { type: "object", required: ["bySource"], properties: {
  bySource: { type: "array", items: { type: "object", required: ["source", "created"], properties: {
    source: { type: "string" }, created: { type: "array", items: { type: "string" } } } } },
} }
const DEDUP_SCHEMA = { type: "object", required: ["merges"], properties: {
  merges: { type: "array", items: { type: "object", properties: { kept: { type: "string" }, removed: { type: "string" }, reason: { type: "string" } } } },
  checkedPairs: { type: "number" },
} }
const CLUSTER_SCHEMA = { type: "object", required: ["clusters"], properties: {
  clusters: { type: "array", items: { type: "object", required: ["slug", "action", "zettels"], properties: {
    theme: { type: "string" }, slug: { type: "string" }, action: { enum: ["create", "update"] },
    zettels: { type: "array", items: { type: "string" } } } } },
  unclustered: { type: "array", items: { type: "string" } },
} }
const SYNTH_SCHEMA = { type: "object", required: ["slug", "action"], properties: {
  slug: { type: "string" }, action: { type: "string" }, linked: { type: "number" }, brokenLinksFixed: { type: "number" }, summary: { type: "string" },
} }
const NAV_SCHEMA = { type: "object", required: ["indexed"], properties: {
  indexed: { type: "number" }, processedWritten: { type: "number" }, indexUpdated: { type: "boolean" }, logUpdated: { type: "boolean" },
} }

// ─── Phase: Setup ───
phase("Setup")
const setup = await agent(
  "Prepare a Knowledge Wiki ingest batch. Use Bash. Do not modify anything.\n" +
  "1. Tag vocabulary: `cd \"" + ZK_DIR + "\" && uv run zettel list-tags --min-count 2 2>&1` → tag names.\n" +
  "2. For each source below, confirm it exists in \"" + SOURCES_DIR + "\" and check \"" + VAULT + "/.status/processed.json\": if an entry for `10_SOURCES/<file>` exists AND its hash equals `shasum -a 256` of the file, it is alreadyProcessed; otherwise toProcess. Missing files go to missing.\n" +
  "3. Count iCloud stubs: `find \"" + SOURCES_DIR + "\" \"" + ZK + "\" -name '*.icloud' | wc -l`.\n" +
  "4. List existing topic page slugs in \"" + TOPICS + "\" (filenames without .md).\n\n" +
  "Sources:\n" + sources.map(s => "- " + s).join("\n") + "\n\nStructured output only.",
  { label: "setup", phase: "Setup", schema: SETUP_SCHEMA })
if (!setup) return { error: "setup failed" }
const todo = skipExtract ? sources : setup.toProcess
log("Setup: " + todo.length + " to ingest, " + (setup.alreadyProcessed || []).length + " already processed, " + (setup.missing || []).length + " missing, " + (setup.icloudStubs || 0) + " iCloud stubs, " + setup.topics.length + " topic pages")
if (!todo.length) return { note: "Nothing to ingest.", alreadyProcessed: setup.alreadyProcessed, missing: setup.missing }

// ─── Phase: Extract (or Collect) ───
let perSource = []
if (!skipExtract) {
  const EXTRACT_PROMPT = (src) =>
    RULES +
    "Extract atomic zettels from ONE source note into the Knowledge Wiki." + (context ? " Batch context: " + context + "." : "") + "\n\n" +
    "SOURCE: \"" + SOURCES_DIR + "/" + src + "\" (immutable — never edit it). Read the whole note, including `## Key claims` (verified quotes) and `## How the code implements it` if present; code-level mechanisms are valid zettel material.\n" +
    "1. Identify atomic concepts (typically 4-10; fewer for thin sources). One idea per zettel, explainable without another idea from the same source. Skip trivia.\n" +
    "2. Dedup: before writing each zettel, `ls \"" + ZK + "\" | grep -i <keywords>` and grep content for key terms. Other agents are extracting related sources right now — also check `ls -t \"" + ZK + "\" | head -100`. If an existing zettel covers the concept, reuse it (link it) instead. Overlapping but distinct → disambiguating name, cross-link in ## Tensions. Never overwrite a file; never use a source-note filename.\n" +
    "3. Write each zettel to \"" + ZK + "/<kebab-case>.md\" in the exact zettel format (Created with today's date, Status: #baby, Tags as [[wikilinks]] from the vocabulary first — at most one new tag; # Title; ## What This Is; ## Why It Matters; ## Key Details; ## Tensions; # References with [[source note name]] and § locations). Real numbers from the source; label inferences.\n" +
    "Tag vocabulary (prefer): " + setup.tags.slice(0, 60).join(", ") + "\n" +
    "4. Verify every [[link]] in your zettels resolves to an existing file (tags excepted).\n" +
    "Return the source filename, created zettel filenames, reused zettel filenames, and one line on the key learning. Structured output only."
  perSource = (await pipeline(todo, (src) => agent(EXTRACT_PROMPT(src), {
    label: "extract:" + src.slice(0, 30), phase: "Extract", schema: EXTRACT_SCHEMA,
  }).then(r => { if (r) log("extract " + src.slice(0, 40) + ": " + r.created.length + " new, " + (r.reused || []).length + " reused"); return r })))
    .filter(Boolean)
} else {
  phase("Collect")
  const col = await agent(
    "Find zettels ALREADY extracted from these source notes (extraction ran earlier; do not extract anything). Use Bash.\n" +
    "For each source name S (filename without .md), list files in \"" + ZK + "\" whose `# References` cite [[S (grep -lF \"[[S\"), then EXCLUDE any zettel already listed under any source's zettels_created in \"" + VAULT + "/.status/processed.json\" (those belong to earlier batches).\n" +
    "Sources:\n" + todo.map(s => "- " + s).join("\n") + "\n\nReturn bySource: [{source, created: [zettel filenames with .md]}]. Structured output only.",
    { label: "collect", phase: "Collect", schema: COLLECT_SCHEMA })
  perSource = (col && col.bySource) || []
}
const newZettels = [...new Set(perSource.flatMap(r => r.created || []))]
log("New zettels in batch: " + newZettels.length)
if (!newZettels.length) return { note: "No new zettels found.", perSource }

// ─── Phase: Dedup (barrier — needs the whole batch) ───
phase("Dedup")
const dedup = await agent(
  "Cross-batch dedup barrier for a Knowledge Wiki ingest. Parallel extractors could not see each other's writes, so the same concept may exist twice. Use Bash/Read/Edit.\n" +
  "Zettels created in this batch (in \"" + ZK + "\"):\n" + newZettels.map(z => "- " + z).join("\n") + "\n\n" +
  "1. Find candidate same-concept pairs WITHIN the batch and between batch zettels and existing vault zettels (name overlap is a weak signal; judge by CONTENT: read both `## What This Is`). A true duplicate explains the same core concept with >70% overlap. Phenomenon vs its fix, or method vs a specific result, are DISTINCT — cross-link instead.\n" +
  "2. For confirmed duplicates only: keep the richer, better-linked note; fold any unique detail from the other into it; repoint inbound links vault-wide: `grep -rl \"\\[\\[<removed>\\]\\]\" \"" + VAULT + "\" | while read f; do sed -i '' \"s/\\[\\[<removed>\\]\\]/[[<kept>]]/g\" \"$f\"; done` (escape names properly); then delete the duplicate. Never delete a note with genuinely distinct content. Never edit 10_SOURCES files.\n" +
  "Return merges [{kept, removed, reason}] and how many pairs you checked. Structured output only.",
  { label: "dedup", phase: "Dedup", schema: DEDUP_SCHEMA })
const removed = new Set(((dedup && dedup.merges) || []).map(m => m.removed))
const finalZettels = newZettels.filter(z => !removed.has(z) && !removed.has(z.replace(/\.md$/, "")))
log("Dedup: " + removed.size + " merged; " + finalZettels.length + " zettels remain")

// ─── Phase: Cluster (barrier — needs the whole deduped batch) ───
phase("Cluster")
const cl = await agent(
  RULES +
  "Group this batch's zettels into themes for topic-page synthesis. Read each zettel's title, Tags and `## What This Is`.\n" +
  "Zettels (in \"" + ZK + "\"):\n" + finalZettels.map(z => "- " + z).join("\n") + "\n\n" +
  "Existing topic pages (\"" + TOPICS + "\"): " + setup.topics.join(", ") + "\n" +
  "For each theme: if an existing topic page covers it, action=update with that slug (read the page's opening to confirm); otherwise action=create with a new kebab-case slug. Prefer updating over creating; create only for a genuinely new theme with ≥5 zettels. Each zettel goes to exactly one cluster; each slug appears in exactly one cluster. Put stragglers in unclustered.\n" +
  "Structured output only.",
  { label: "cluster", phase: "Cluster", schema: CLUSTER_SCHEMA })
const clusters = []
const seenSlug = new Map()
for (const c of ((cl && cl.clusters) || [])) {       // guarantee one agent per slug
  if (seenSlug.has(c.slug)) seenSlug.get(c.slug).zettels.push(...c.zettels)
  else { const cc = { ...c, zettels: [...c.zettels] }; seenSlug.set(c.slug, cc); clusters.push(cc) }
}
log("Cluster: " + clusters.length + " themes (" + clusters.filter(c => c.action === "create").length + " new pages); unclustered " + ((cl && cl.unclustered) || []).length)

// ─── Phase: Synthesize (pipeline — one agent per topic page) ───
const SYNTH_PROMPT = (c) =>
  RULES +
  (c.action === "update"
    ? "UPDATE the existing topic page \"" + TOPICS + "/" + c.slug + ".md\". Read it fully first. Weave the new zettels into the narrative where they belong (new sections only when needed), add their sources to `## Sources`, record new contradictions and open questions, bump `Updated:` and the Sources/Zettels counts. Keep everything already there unless proven false.\n"
    : "CREATE a new topic page \"" + TOPICS + "/" + c.slug + ".md\" (theme: " + (c.theme || c.slug) + ") in the topic format: header (Created, Updated, Type: topic-overview, Sources, Zettels, Tags), # Title, then a Feynman-style narrative organised by the questions a reader faces, `## Open Questions`, `## Contradictions`, `## Sources`. Link related existing topic pages.\n") +
  "Zettels for this theme (read each; also pull in closely related existing zettels via `cd \"" + ZK_DIR + "\" && uv run zettel search \"<theme>\" --top-k 10`):\n" + c.zettels.map(z => "- " + z).join("\n") + "\n" +
  "Link zettels inline with [[kebab-name]] and sources with [[source note name]]. Real numbers. Every [[link]] must resolve (verify with find; tag links excepted). Do not touch index.md, log.md or processed.json.\n" +
  "Return slug, action, number of zettels linked, links fixed, and a two-line summary of what the page now teaches. Structured output only."
const synth = (await pipeline(clusters, (c) => agent(SYNTH_PROMPT(c), {
  label: (c.action === "create" ? "create:" : "update:") + c.slug.slice(0, 28), phase: "Synthesize", schema: SYNTH_SCHEMA,
}).then(r => { if (r) log(r.action + " " + r.slug + " (" + (r.linked || 0) + " zettels)"); return r }))).filter(Boolean)

// ─── Phase: Navigate (processed.json LAST) ───
phase("Navigate")
const bySrc = sources.map(s => ({ source: s, created: ((perSource.find(p => p.source === s || p.source === s.replace(/\.md$/, "")) || {}).created || []).filter(z => !removed.has(z)) }))
const nav = await agent(
  "Finish a Knowledge Wiki ingest: navigation and state. Use Bash/Read/Edit/Write.\n" +
  "1. \"" + VAULT + "/50_MOC/index.md\": add one line per NEW topic page under `## Topics` (`- [[slug]] — one-line summary`; read the page for the summary); update the one-line summary of UPDATED pages only if it is now wrong. Update the `Updated:` date.\n" +
  "2. \"" + VAULT + "/50_MOC/log.md\": PREPEND (newest first, append-only otherwise) an entry `## <DD-MM-YYYY HH:MM> — ingest: <short batch name> (" + sources.length + " sources)` listing sources, zettels created (count + names), dedup merges, wiki pages created/updated, and 2-4 sharpest findings from the summaries below. End with `---`.\n" +
  "3. \"" + VAULT + "/.status/processed.json\": for each source add/overwrite `10_SOURCES/<file>` with {hash: \"sha256:<shasum -a 256>\", processed_at, zettels_created (names without .md), wiki_pages_created, wiki_pages_updated, skipped:false}. Write this file LAST among the three.\n" +
  "4. Rebuild the semantic index: `cd \"" + ZK_DIR + "\" && uv run zettel rebuild-index` and report the indexed count.\n\n" +
  "Per-source zettels:\n" + JSON.stringify(bySrc) + "\n" +
  "Dedup merges: " + JSON.stringify((dedup && dedup.merges) || []) + "\n" +
  "Topic pages: " + JSON.stringify(synth.map(s => ({ slug: s.slug, action: s.action, summary: s.summary }))) + "\n" +
  "Key learnings: " + JSON.stringify(perSource.map(p => p.keyLearning).filter(Boolean)) + "\n\nStructured output only.",
  { label: "navigate", phase: "Navigate", schema: NAV_SCHEMA })

return {
  sources: todo.length,
  zettelsCreated: finalZettels.length,
  merges: (dedup && dedup.merges) || [],
  pages: synth.map(s => ({ slug: s.slug, action: s.action, linked: s.linked, summary: s.summary })),
  unclustered: (cl && cl.unclustered) || [],
  indexed: nav ? nav.indexed : null,
  keyLearnings: perSource.map(p => ({ source: p.source, learning: p.keyLearning })).filter(p => p.learning),
}
