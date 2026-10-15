export const meta = {
  name: 'research-decode',
  description: 'Deep-decode picked sources into 10_SOURCES/ Obsidian notes, in parallel. Each agent fetches the FULL source by type (paper full text, repo cloned + code walked, docs subpages), right-sizes depth, weaves vault [[wikilinks]], writes a Literature-Template note with a code walkthrough (when code exists) and a Key claims section with verbatim quotes. Then a verifier checks quotes and code excerpts against the fetched text. Feeds /knowledge-wiki ingest.',
  whenToUse: 'After research-scope: pass the sources you picked (url + title + type) and this decodes each into a source note. Token-frugal: bounded by your picks, depth self-sized per source. Does the front-half of the knowledge pipeline; zettel extraction is /knowledge-wiki ingest (run after).',
  phases: [
    { title: 'Setup', detail: 'Load tag vocabulary + existing vault filenames (once, shared)' },
    { title: 'Decode', detail: 'One agent per source: type-routed full fetch (+clone repo), deep-decode, code walkthrough, key claims, write 10_SOURCES note' },
    { title: 'Verify', detail: 'Quality-check per note + exact-match check of quotes and code excerpts against the cached fetch (no auto-fix)' },
  ],
}

// research-decode: Setup -> pipeline(Decode -> Verify) per source.
// Input via args: a JSON array of {url, title?, type?} OR a plain newline/space list of URLs.
// Augment mode: {url, mode: "augment", note: "<existing 10_SOURCES filename>"} adds Terms and setup,
// tables and figures to an existing note without rewriting it.
// Patterned on research-scope; writes notes instead of returning a list.
// Per docs: the SCRIPT has no FS/shell access — agents do all reading/writing.

const VAULT = "__VAULT__"
const SOURCES_DIR = VAULT + "/10_SOURCES"
const ASSETS_DIR = VAULT + "/70_ASSETS"                        // figures + table images, embedded by filename
const ZK_DIR = "__ZK_DIR__"   // for `uv run zettel ...`
const CACHE_DIR = "/tmp/decode-cache"                          // fetched full text, one file per source (for quote verification)
const REPO_DIR = "/tmp/decode-repos"                           // shallow clones for code walkthroughs

// ─── Parse args: accept a JSON array of objects, or a loose list of URLs ───
let picks = []
if (Array.isArray(args)) {
  picks = args
} else if (typeof args === "string" && args.trim()) {
  const t = args.trim()
  try {
    const parsed = JSON.parse(t)
    picks = Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    // not JSON — treat as whitespace/newline-separated URLs
    picks = t.split(/\s+/).filter(u => /^https?:\/\//.test(u)).map(u => ({ url: u }))
  }
}
picks = picks.filter(p => p && p.url)
if (picks.length === 0) {
  return { error: "No sources to decode. Pass args as a JSON array of {url,title,type} or a list of URLs." }
}

// ─── Schemas ───
const SETUP_SCHEMA = {
  type: "object", required: ["tags"],
  properties: {
    tags: { type: "array", items: { type: "string" } },          // approved tag vocabulary (labels only)
  },
}

const DECODE_SCHEMA = {
  type: "object", required: ["status"],
  properties: {
    status: { enum: ["written", "augmented", "skipped-exists", "failed"] },
    filename: { type: "string" },     // the note file written (basename)
    depth: { enum: ["foundation", "solid", "comprehensive", "definitive"] },  // self-selected
    sourceQuality: { enum: ["primary", "secondary", "blog", "forum", "unreliable"] },
    wikilinks: { type: "array", items: { type: "string" } },  // related notes linked
    cacheFile: { type: "string" },    // path of the cached full text used for the decode
    repoPath: { type: "string" },     // path of the shallow clone, if code was walked
    commit: { type: "string" },       // short commit hash of the clone
    codeWalked: { type: "boolean" },  // true if a code walkthrough section was written
    claims: { type: "number" },       // number of Key claims written
    terms: { type: "number" },        // number of glossary entries in Terms and setup
    tables: { type: "number" },       // number of tables reproduced (markdown or image)
    figures: { type: "array", items: { type: "string" } },   // asset filenames saved + embedded
    note: { type: "string" },         // short status note / reason if skipped/failed
  },
}

const VERIFY_SCHEMA = {
  type: "object", required: ["gaps", "ok"],
  properties: {
    ok: { type: "boolean" },          // true if no major gaps
    gaps: { type: "array", items: { type: "string" } },   // checklist items missing
    quotesChecked: { type: "number" },
    quotesFailed: { type: "array", items: { type: "string" } },   // quotes not found verbatim in the cached source
    codeFailed: { type: "array", items: { type: "string" } },     // code excerpts not found at the cited path in the clone
    tableNumbersChecked: { type: "number" },
    tableNumbersFailed: { type: "array", items: { type: "string" } },  // table numbers not found in the cached source
    figuresFailed: { type: "array", items: { type: "string" } },       // embeds missing, blank, or showing the wrong thing
    comment: { type: "string" },
  },
}

// ─── Phase 0: Setup — load tag vocabulary only (labels, tiny). ONE shared agent.
//     Dedup is NOT done here: each decode agent greps 10_SOURCES for ITS OWN source's
//     id/title (bounded), so we never pull all ~500 filenames into context. ───
phase("Setup")
const setup = await agent(
  "Load the approved tag vocabulary for a batch source-note decode. Use your Bash tool.\n\n" +
  "Run: `cd \"" + ZK_DIR + "\" && uv run zettel list-tags --min-count 2 2>&1`\n" +
  "Return the tag NAMES as the `tags` array (labels only, not note contents). If it errors, return an empty array.\n\nStructured output only.",
  { label: "setup", phase: "Setup", schema: SETUP_SCHEMA }
)
const tagVocab = setup?.tags || []
log("Setup: " + tagVocab.length + " tags loaded. Decoding " + picks.length + " picks (dedup per-source).")

// ─── Decode prompt — carries the research-papers skill fidelity rules VERBATIM ───
const DECODE_PROMPT = (src) =>
  "Deep-decode this source into an Obsidian note. CLI-quality deep decode, NOT a summary.\n\n" +
  "SOURCE URL: " + src.url + "\n" +
  (src.title ? "TITLE (hint): " + src.title + "\n" : "") +
  (src.type ? "TYPE (hint): " + src.type + "\n" : "") + "\n" +
  (src.mode === "augment"
    ? "## Step 1 — AUGMENT MODE (an existing note is being upgraded)\n" +
      "EXISTING NOTE: \"" + SOURCES_DIR + "/" + (src.note || "") + "\"\n" +
      "Read it first. Do NOT skip, rewrite, reorder or delete any of its content. Do Step 2 (fetch + cache the full source) and run the Step 4 vault search, then ONLY Steps 3d, 3e, 3f, 3g and 3h, inserting with the Edit tool: `## Terms and setup` immediately after the `# Notes` line; each table and figure at the spot in the existing text where it is discussed (if there is no natural spot, in a `## Key tables and figures` section placed before `## Key claims`); if the note has no `## Key claims` section, also do Step 3c and append `## Key claims` at the end of the note; `## Limitations` and then `## Expert read` just before `## Key claims` (if the note already has a limitations section of any name, move each of its items, unchanged, under the matching split heading, then delete the old heading so there is exactly one `## Limitations`; if the note already has `## Terms and setup`, `## Limitations` or `## Expert read` in the new format, do not add a second copy). Skip Steps 3, 3b and 5 (and 3c when the note already has `## Key claims`). Return status=\"augmented\" with filename = the existing note's basename and cacheFile.\n\n"
    : "## Step 1 — Dedup check (Bash)\n" +
      "Run: `ls \"" + SOURCES_DIR + "\" 2>/dev/null | grep -i -E \"<arxiv-id-or-key-title-words>\"`\n" +
      "If a note for this source already exists, STOP: return status=\"skipped-exists\" with the filename.\n\n") +
  "## Step 2 — Fetch the FULL source, routed by type (Bash + WebFetch)\n" +
  "Goal: decode from the complete source, never from an abstract or landing page. Save the full text you decode from to `" + CACHE_DIR + "/{NAME}.txt` (mkdir -p first) — the verifier checks your quotes against this file.\n" +
  "- PAPER (arXiv or PDF): get the full text, not the abstract page. Try `https://arxiv.org/html/<id>` (WebFetch); else download the PDF with curl and extract text with `pdftotext -layout`. Look for a linked code repository (a GitHub link in the paper or on its arXiv/project page). If one exists, ALSO do the REPO steps below for it.\n" +
  "- REPO (GitHub etc.): `mkdir -p " + REPO_DIR + " && git clone --depth 1 <url> " + REPO_DIR + "/<owner>-<repo>`; record `git -C <path> rev-parse --short HEAD`. Read the README, then map the tree (`find <path> -name '*.py' -o -name '*.ts' | head -200`, plus `ls`) and read the core files (see Step 3b). Cache README + the files you read into the cache file.\n" +
  "- DOCS (multi-page documentation): fetch the landing page AND the subpages that carry the substance (typically 3-8: concepts, core API, a worked example). Cache all of them.\n" +
  "- BLOG / ARTICLE: fetch the full post.\n" +
  "Fetch fallback chain — escalate until you get real content: WebFetch → `mcp__web-reader__webReader` (load via ToolSearch) → `curl -sL` → return status=\"failed\" with the reason. JS-rendered pages often return only a title on the first try; escalate rather than decode from a stub.\n\n" +
  "## Step 3 — Right-size DEPTH to the source (dynamic)\n" +
  "Judge length & density, then pick depth — do NOT pad a short piece or shortchange a rich one:\n" +
  "- foundation (8-12K): short blog/post, core ideas + basic mechanics\n" +
  "- solid (12-18K): full paper/substantial article — mechanisms, design choices, limitations\n" +
  "- comprehensive (18-30K): dense paper with heavy math/experiments — + examples, benchmarks, advanced topics\n" +
  "Report which depth you chose.\n\n" +
  "## Step 3b — Code walkthrough (only if a repo was cloned)\n" +
  "Find the pieces that carry the idea, not boilerplate. For an environment/agent/training repo these are usually: the environment or task class (reset/step or equivalent), the reward / grader / verifier, the task or data generator, the data/state schema, and the hook into the trainer or eval loop. For other repos, the equivalent core mechanism.\n" +
  "Write a section `## How the code implements it` with 3-6 excerpts. For each excerpt, in this order: (1) the problem this piece of code solves, in plain words; (2) the excerpt itself, copied VERBATIM, at most ~25 lines, in a fenced block, with its location as `path/to/file.py:START-END @ <commit>` on the line above; (3) a walk through what the lines do and why it is built this way. Where the code differs from what the paper or README claims, say so explicitly — that is often the most valuable finding.\n" +
  "Add the repo as reference 2 in the References list: `2. Code: [<owner>/<repo> @ <commit>](<url>)`.\n\n" +
  "## Step 3c — Key claims (always)\n" +
  "End the decode with a section `## Key claims` listing the 5-12 most important claims or results. For each: the claim in one plain sentence; the number if there is one; the setup it was measured under (model, data, scale, conditions) so a reader knows where it holds; then the evidence as a blockquote copied EXACTLY from your cache file (1-3 sentences, no paraphrase, no ellipses inside the quote) followed by its location (section / table / page / file). If you cannot find an exact supporting sentence, say `(no direct quote — stated in <location>)` instead of inventing one.\n\n" +
  "## Step 3d — Terms and setup (always; the FIRST section under `# Notes`)\n" +
  "Write `## Terms and setup` as the reference page a reader returns to while reading the rest. Two parts:\n" +
  "1. `### Setup` — the concrete setting THIS source works in, described in its own terms: what is being studied or built, what goes in and what comes out, what data / inputs / systems are used, how success is measured, and what it is compared against. Include only the components this source actually has; never force a heading that does not apply (a theory paper may have no dataset, a blog no baseline, a repo no metric). Short plain paragraphs or bullets.\n" +
  "2. `### Terms` — a bulleted glossary of every term, acronym, named method and symbol the source uses more than once or depends on: `- **term** — what it is / what it does, in plain words (first used: <section>)`. Define each the way THIS source uses it. If the source has equations, add a notation table `| Symbol | Meaning |`.\n\n" +
  "## Step 3e — Tables (when the source has tables)\n" +
  "Reproduce the 1-4 tables that carry the main results or the core setup as markdown tables, copying every number EXACTLY with the original row and column labels. You may drop rows or columns that do not bear on the point, and must say so under the table. Above each table: `**Table N (<location>): <caption>**`. Below it: one or two sentences on how to read it and what it shows. Get tables from the HTML version when one exists (`https://arxiv.org/html/<id>`); for PDFs use `python3` with pdfplumber (`page.extract_tables()`). If a table cannot be extracted faithfully, save it as an image exactly like a figure (Step 3f) instead of retyping it. Place each table where the decode discusses it.\n\n" +
  "## Step 3f — Figures (when the source has figures, diagrams or plots)\n" +
  "Save the 2-5 figures that carry the idea (method or architecture diagram, main result plot, key worked example) as PNG files in the vault assets folder `" + ASSETS_DIR + "/`, named `{KEY}-fig{N}.png` where KEY is the arXiv id or a short slug of the source (Obsidian resolves embeds by filename, so the prefix prevents collisions; use the source's own figure number N). Get them in this order: (a) HTML version: download the figure image files it references with curl; (b) PDF: `python3` with PyMuPDF (`fitz`) — find the caption block starting `Figure N` / `Fig. N` on its page, take the region above it that holds the drawings/images (between the previous text block and the caption), render with `page.get_pixmap(clip=rect, dpi=200)` and save; (c) last resort: `pdftoppm -png -r 150 -f P -l P` of the whole page; (d) repos and blogs: download the images their README or post references. Open every saved PNG with your Read tool and confirm it shows the intended figure (not blank, not a wrong or half crop); redo it if not. Embed each with `![[{KEY}-fig{N}.png]]` on its own line where the decode discusses it, followed by `*Figure N (<location>): <caption>* — what it shows, in one sentence.`\n\n" +
  "## Step 3g — Limitations, split by source (always)\n" +
  "Write `## Limitations` with two parts and never mix them: `### Stated by the authors` — each limitation the source itself admits, with a short exact quote and its location (write `None stated.` if there are none); `### Found while decoding` — weaknesses you found yourself (a missing ablation, a claim the code or tables do not support, a confound, a small sample), each with its evidence (section, table, figure or `file:line`). Do not invent limitations to fill either part.\n\n" +
  "## Step 3h — Expert read (always; placed just before `## Key claims`)\n" +
  "Write `## Expert read` — your own analysis, which the source does not state. Open it with the line `*Decoder's analysis, not the source's claims. Each point names its evidence.*` Then six short parts, each 2-5 sentences, each naming its evidence (section, table, figure, `file:line`, or a vault [[wikilink]]):\n" +
  "1. `### Core insight` — what is actually new, in one or two sentences, with the framing and marketing stripped off.\n" +
  "2. `### What the result depends on` — the conditions the result rests on, and when it would stop holding.\n" +
  "3. `### Claims vs evidence` — where what the source claims differs from what its own tables, appendix or code show (write `No gaps found.` if none).\n" +
  "4. `### Strongest objection` — the best attack a skeptical reviewer would make, and the missing experiment that would settle it.\n" +
  "5. `### Connections the source does not make` — non-obvious links to notes in the vault (supports, contradicts, or the same idea elsewhere), using the vault search from Step 4.\n" +
  "6. `### What to do with it` — a practical takeaway, an open question, or the next thing worth building or testing.\n\n" +
  "## Step 4 — Vault context (Bash)\n" +
  "Run: `cd \"" + ZK_DIR + "\" && uv run zettel search \"<key topic terms>\" --top-k 5 2>&1`\n" +
  "Use the returned note names to add [[wikilinks]] where this source connects to / extends / contradicts prior work.\n" +
  "Approved tag vocabulary (prefer these if you were to tag — but DO NOT pre-fill tags): " + (tagVocab.slice(0, 40).join(", ") || "(none)") + "\n\n" +
  "## Step 5 — Write the note (Write tool)\n" +
  "Path: \"" + SOURCES_DIR + "/{NAME}.md\"\n" +
  "NAME: `{arxiv-id} - {Short Title}` for papers, `{Author} - {Title}` for blogs, `{owner}-{repo} - {Topic}` for GitHub.\n\n" +
  "HEADER — match EXACTLY (no YAML fences, no extra fields):\n" +
  "```\n" +
  "Created: {DD-MM-YYYY} {HH:MM}\n\n" +
  "Tags:\n\n" +
  "Status: #baby\n\n" +
  "## References\n\n" +
  "1. [{Title}]({URL})\n\n" +
  "# Notes\n\n" +
  "{the deep decode}\n" +
  "```\n\n" +
  "## WRITING STANDARD (non-negotiable)\n" +
  "- Start with the PROBLEM the work solves. Why does it exist?\n" +
  "- Build simple→complex (Feynman): explain plainly first, then add technical layers.\n" +
  "- TECHNICAL DEPTH REQUIRED: derive loss functions & explain each term; trace architectures end-to-end; explain experiment setup/controls/key numbers; walk equations symbol by symbol.\n" +
  "- Point out what's interesting/surprising/non-obvious — non-default design choices, results that defy expectations.\n" +
  "- Limitations go in the split `## Limitations` section (Step 3g); your own critical analysis goes in `## Expert read` (Step 3h) — never present your inference as the source's claim.\n" +
  "- Follow the source's natural flow; do NOT impose a rigid section structure.\n" +
  "- Connect to existing knowledge with [[wikilinks]] from the vault search.\n" +
  "- NO JARGON WITHOUT EARNING IT: introduce every technical term through what it does before using it; never leave a term unexplained or string terms together as a substitute for explanation.\n" +
  "- NO FILLER: every sentence must teach something or connect something. Write in full, plain sentences — not keyword lists or fragments.\n" +
  "- Code excerpts and Key claims follow the same voice: explain the problem first, then the specifics.\n\n" +
  "## WHAT NOT TO DO\n" +
  "- Do NOT pre-fill Tags — leave the `Tags:` line empty (human curates later).\n" +
  "- Do NOT add YAML fences or extra header fields (no `Source:`).\n" +
  "- Do NOT produce a summary — produce a deep decode.\n" +
  "- Do NOT overwrite an existing note (you checked in Step 1).\n" +
  "- Do NOT decode from an abstract, landing page or README alone when the full paper / code / subpages are reachable.\n" +
  "- Do NOT paraphrase inside a quote or edit code inside an excerpt.\n\n" +
  "Return status=\"written\" (or \"augmented\" in augment mode), the filename, the depth you chose, source quality, the wikilinks you used, cacheFile, repoPath and commit (if cloned), codeWalked, the number of Key claims, the number of glossary terms, the number of tables, and the figure filenames you saved.\n\nStructured output only."

const VERIFY_PROMPT = (filename, cacheFile, repoPath) =>
  "Quality-check a freshly written source note. Read it, then flag gaps. Do NOT edit it.\n\n" +
  "Note: \"" + SOURCES_DIR + "/" + filename + "\"\n" +
  "Cached source text: " + (cacheFile ? "\"" + cacheFile + "\"" : "(none reported)") + "\n" +
  "Cloned repo: " + (repoPath ? "\"" + repoPath + "\"" : "(none)") + "\n\n" +
  "MECHANICAL CHECKS (Bash + python, do these first):\n" +
  "1. Quotes: extract every blockquote (lines starting with '> ') under `## Key claims`. For each, normalise whitespace and check it is a substring of the whitespace-normalised cache file. Report the count checked and list every quote that fails.\n" +
  "2. Code: for each fenced excerpt under `## How the code implements it`, read the cited file in the clone and check the excerpt's lines appear there (whitespace-normalised). List every excerpt that fails.\n" +
  "3. Tables: for every markdown table in the note (rows starting with '|', excluding the `| Symbol | Meaning |` notation table and separator rows), extract each number in the data cells and check it occurs in the cache file (try it as written, without a trailing %, and with or without a leading 0 before the decimal point). Report how many numbers were checked and list every one not found, with its table.\n" +
  "4. Figures: for every `![[...]]` embed, check the file exists in \"" + ASSETS_DIR + "/\" and is larger than 5 KB, then open it with your Read tool and confirm it shows a figure that matches the caption under it. List every embed that is missing, blank, mis-cropped or mismatched.\n\n" +
  "THEN THE WRITING CHECK:\n" +
  "Read it with your Read tool, then check against this list (skip items that genuinely don't apply to this source):\n" +
  "- Problem & motivation clear\n- Core idea explained simply before depth\n- Technical depth present (equations/architecture/experiments walked through)\n" +
  "- Non-obvious design choices explained\n- Genuine limitations noted (not forced)\n- Positioning vs alternatives\n- [[wikilinks]] to related vault notes\n" +
  "- Header matches the Literature Template exactly (Tags line EMPTY, no YAML fences)\n" +
  "- Plain, Feynman-style prose: terms explained through what they do; no keyword soup, no filler sentences\n" +
  "- `## Key claims` present with setups and exact quotes\n" +
  "- `## Terms and setup` is the first section under `# Notes`, with `### Setup` describing this source's own setting (not a generic template, no forced headings) and `### Terms` defining the recurring terms and symbols\n" +
  "- If the source has tables or figures: the key ones are reproduced or embedded, each with its caption, location and a line on what it shows\n" +
  "- `## Limitations` split into `### Stated by the authors` (each with a quote + location) and `### Found while decoding` (each with evidence)\n" +
  "- `## Expert read` present before `## Key claims`, opens with the decoder's-analysis label, has all six parts, and every point names its evidence; no inference is presented as the source's claim\n" +
  "- If a repo was cloned: `## How the code implements it` present, each excerpt preceded by the problem it solves and followed by a walkthrough\n\n" +
  "Return ok=true if no MAJOR gaps; otherwise list the specific gaps.\n\nStructured output only."

// ─── Phases 1+2: pipeline(decode -> verify) per source. No barrier: each note verifies
//     as soon as it's written, while other sources are still decoding. ───
const results = await pipeline(
  picks,

  // Stage 1: decode + write
  (src, _orig, i) => agent(DECODE_PROMPT(src), {
    label: "decode:" + (src.title || src.url).slice(0, 32),
    phase: "Decode",
    schema: DECODE_SCHEMA,
  }).then(d => {
    if (!d) { log("decode " + i + ": no result (skipped/errored)"); return null }
    log("decode: " + d.status + (d.filename ? " → " + d.filename : "") + (d.depth ? " [" + d.depth + "]" : ""))
    return { src, ...d }
  }),

  // Stage 2: verify (only if a note was actually written)
  (decoded) => {
    if (!decoded || !["written", "augmented"].includes(decoded.status) || !decoded.filename) return decoded
    return agent(VERIFY_PROMPT(decoded.filename, decoded.cacheFile, decoded.repoPath), {
      label: "verify:" + decoded.filename.slice(0, 32),
      phase: "Verify",
      schema: VERIFY_SCHEMA,
    }).then(v => {
      if (v) log("verify " + decoded.filename + ": " + (v.ok ? "ok" : v.gaps.length + " gaps") +
        " · quotes " + (v.quotesChecked || 0) + " checked, " + ((v.quotesFailed || []).length) + " failed" +
        ((v.codeFailed || []).length ? " · code excerpts failed: " + v.codeFailed.length : "") +
        " · table numbers " + (v.tableNumbersChecked || 0) + " checked, " + ((v.tableNumbersFailed || []).length) + " failed" +
        ((v.figuresFailed || []).length ? " · figures failed: " + v.figuresFailed.length : ""))
      return { ...decoded, verify: v || null }
    })
  }
)

// ─── Report ───
const done = results.filter(Boolean)
const written = done.filter(r => r.status === "written" || r.status === "augmented")
const skipped = done.filter(r => r.status === "skipped-exists")
const failed = done.filter(r => r.status === "failed")
const flagged = written.filter(r => r.verify && !r.verify.ok)

log("Done: " + written.length + " written, " + skipped.length + " skipped, " + failed.length + " failed, " + flagged.length + " flagged for gaps")

return {
  decoded: picks.length,
  written: written.map(r => ({
    filename: r.filename, url: r.src.url, status: r.status, depth: r.depth,
    terms: r.terms || 0, tables: r.tables || 0, figures: r.figures || [],
    tableNumbersChecked: r.verify ? (r.verify.tableNumbersChecked || 0) : 0,
    tableNumbersFailed: r.verify ? (r.verify.tableNumbersFailed || []) : [],
    figuresFailed: r.verify ? (r.verify.figuresFailed || []) : [],
    quality: r.sourceQuality, wikilinks: r.wikilinks || [],
    gaps: r.verify && !r.verify.ok ? r.verify.gaps : [],
    codeWalked: !!r.codeWalked, commit: r.commit || null, claims: r.claims || 0,
    quotesChecked: r.verify ? (r.verify.quotesChecked || 0) : 0,
    quotesFailed: r.verify ? (r.verify.quotesFailed || []) : [],
    codeFailed: r.verify ? (r.verify.codeFailed || []) : [],
  })),
  skipped: skipped.map(r => ({ url: r.src.url, filename: r.filename, note: r.note })),
  failed: failed.map(r => ({ url: r.src.url, note: r.note })),
  handoff: written.length > 0
    ? "Source notes written to 10_SOURCES/. To extract zettels + build wiki pages, run: /knowledge-wiki ingest 10_SOURCES/"
    : "No new notes written.",
}
