# Ingest Workflow

## Preferred: run the `knowledge-wiki-ingest` workflow

The steps below are encoded as a fixed pipeline in `~/.claude/workflows/knowledge-wiki-ingest.js`. Use it for any batch of 2+ sources instead of improvising subagents:

```
Workflow({ name: "knowledge-wiki-ingest", args: { sources: ["<10_SOURCES filename>", ...], context: "<what the batch is about>" } })
```

Phases: Setup (tag vocabulary, processed.json hash check, iCloud stubs, topic list) → Extract (one agent per source, in parallel, reads body + `## Key claims` + `## How the code implements it`) → Dedup (barrier across the whole batch — the Step 1.5 rule) → Cluster (themes → update an existing topic page or create one) → Synthesize (one agent per topic page) → Navigate (index.md, log.md, processed.json last, rebuild-index).

- `skipExtract: true` — zettels already exist for these sources; run only Collect → Dedup → Cluster → Synthesize → Navigate.
- If the named workflow was edited this session, invoke by `scriptPath` (the named registry loads at session start).
- Single-source ingest stays interactive (Safety Rule 3): follow the manual steps below.

## Manual steps (reference — what the workflow does)

Process source notes into zettels and wiki pages. **Concept extraction is done in-session by Claude** — read sources, identify atomic concepts, write zettel files. The `zettel` CLI is used for deterministic helpers only (search, list-tags). ChromaDB indexing is deferred — run `uv run zettel rebuild-index` manually after a batch when you trust the new zettels.

## When To Use

- "Process these notes into my knowledge base"
- "I added new sources — ingest them"
- "Extract and connect these notes"

## Steps

### 0. Load Existing Tag Vocabulary

**MANDATORY before writing any note or wiki page.** Run:

```bash
cd $ZK_DIR && uv run zettel list-tags --min-count 2 2>&1
```

Capture the output — this is the approved tag vocabulary. When tagging zettels or wiki pages:
1. **Prefer existing tags** — match to this list first
2. **Coin new tags sparingly** — only when nothing in the list fits the concept
3. **Never use paper-specific jargon as tags** (e.g., `[[FIFO]]`, `[[VLA]]`, `[[LoRA]]`) — map to the general concept (`[[memory-management]]`, `[[representation-learning]]`, `[[fine-tuning-strategies-for-llms]]`)
4. **Maximum 1 new domain-specific tag per zettel** (e.g., `[[SAM2Act]]` when multiple notes belong to that system)

If `zettel list-tags` is unavailable, read the Tags lines directly:
```bash
grep -h "^Tags:" "$VAULT/20_ZETTLEKASTEN/"*.md | tr ' ' '\n' | grep '^\[\[' | sort | uniq -c | sort -rn | head -50
```

---

### 1. Extract (in-session, Claude does this)

For each source file in `$SOURCE_PATH`:

1. **Read the source** with the Read tool. The zettel body must be defensible against this source; SKILL.md Writing Principle #7 covers what "defensible" means.

2. **Identify atomic concepts** — one idea per zettel. A concept is atomic when it can be explained without depending on another idea from the same source. Skip junk (todo lists, meeting notes, status updates).

3. **Dedup against existing zettels.** Search `20_ZETTLEKASTEN/` for similar kebab-case filenames and grep for the concept's key terms. If a candidate exists, read its `## What This Is` section and choose:

   - **Empty stub (≤20 lines, no body content):** fill it from the source using the current zettel format.
   - **Solid zettel in older format** (uses `## Definition` / `# See Also`): leave the existing structure intact. Append new sections in the current format if you have substantively new material.
   - **Already covers your concept:** skip. Optionally extend with a sub-bullet if you have a genuinely new detail.
   - **Overlapping but distinct concept:** create your zettel with a disambiguating name. Cross-link both in `## Tensions` to explain the distinction.
   - **Not covered:** write a new zettel.

4. **Write each new zettel** with the Write tool to `20_ZETTLEKASTEN/<kebab-case-title>.md` using the Zettel format from `references/formats.md`. Match the template — body sections are `## What This Is / ## Why It Matters / ## Key Details / ## Tensions`, and cross-references to other zettels go inline in `## Tensions`.

5. **Apply the writing principles** from SKILL.md — Feynman, why-not-just-what, no filler, source-first writing. Body claims trace to the source; inline `(per source §X)` citations are encouraged for specific numbers and quotes. `# References` lists the source notes used, optionally with §-coverage.

6. **Track what you wrote** — keep a running list of {source, concepts_extracted, zettels_created} for the report at the end.

If the user said `ingest` with no path, ask them which folder or file to process.

**ChromaDB index** is rebuilt at Step 4.5 of this workflow, not during extraction.

### 1.5. Cross-Batch Dedup Barrier (REQUIRED if extraction was parallelized)

**The parallel-extract trap (learned 10-06-2026):** if multiple agents/subagents extract zettels *concurrently*, each one only dedups against the *pre-existing* vault — it is blind to zettels its siblings are writing in the same batch. Two agents reading two papers on the same topic will each create a zettel for the shared concept (e.g. two `superposition` notes from the Towards-Mono and Scaling-Mono decodes). Per-source dedup cannot catch this; you need a barrier AFTER all writes and BEFORE synthesis.

Run this whenever extraction ran in parallel (e.g. via a Workflow with `parallel()`):

1. **List the new batch** — the zettels created in this run.
2. **Find same-concept pairs.** Name overlap is a weak signal (`topk-activation` vs `jumprelu-activation` share tokens but are DISTINCT). Judge by CONTENT: read both `## What This Is` sections. A true duplicate explains the *same core concept* with >70% overlap. Related-but-different (phenomenon vs its fix; method vs the specific result) → KEEP DISTINCT and cross-link instead.
3. **Merge confirmed dupes only:** keep the richer/better-linked note, fold any unique detail from the other into it, repoint inbound `[[links]]` (`grep -rl "\[\[<delete>\]\]" 20_ZETTLEKASTEN | xargs sed -i '' "s/\[\[<delete>\]\]/[[<keep>]]/g"`), then `rm` the dupe. Never delete a note whose content is genuinely distinct.

Sequential extraction does NOT need this barrier (each agent sees prior writes). Prefer the barrier over going sequential — parallel is much faster and the barrier is cheap.

### 2. Identify What's New

Read the pipeline output. For each newly created zettel:

```bash
cd $ZK_DIR && uv run zettel search "CONCEPT_DESCRIPTION" --top-k 10 2>&1
```

If `zettel search` is not yet available, read the new zettel files directly from `20_ZETTLEKASTEN/` and use the Read tool to find related notes by reading their Tags and Tensions sections.

Group the new zettels by theme — which ones cluster around the same topic?

### 3. Synthesize Wiki Pages

For each theme cluster:

1. Read all the relevant zettels (new + related existing ones found by search)
2. Check `50_MOC/topics/` — does a topic page already exist for this theme?
   - **Yes:** Read it. Update it with new information. Update the `Updated:` date.
   - **No:** Create a new topic page. Write it in Feynman style with [[wikilinks]] to the zettels.
3. If two concepts directly contrast, create a comparison page in `50_MOC/comparisons/`.
4. Write all pages using the Write tool directly to the vault path.

### 4. Update Navigation

1. Read `50_MOC/index.md`. Add new wiki pages. Keep alphabetical.
2. Append an entry to `50_MOC/log.md` (newest first).

### 4.5. Rebuild Semantic Index

After zettels are written and wiki pages updated, rebuild the ChromaDB index so the new zettels are searchable:

```bash
cd $ZK_DIR && uv run zettel rebuild-index
```

Confirm the indexed count increased by approximately the number of new zettels created. If the count is way off, something didn't get written correctly — investigate before moving on.

### 5. Report

Tell the user:
- **What was extracted:** N zettels from M sources
- **What was synthesized:** which wiki pages created or updated
- **What's interesting:** contradictions found, surprising connections, gaps identified
- **Ideas worth exploring:** 1-3 proactive suggestions based on what you just learned

Do NOT just list files. Tell them what you LEARNED from processing their notes.

## Batch Processing

For multiple sources, process one at a time. After every 4-5 sources, checkpoint: show what you've built so far, ask if adjustments are needed. Continue.

## Edge Cases

- **Source yields no concepts:** Tell the user. Note it in log.md. Move on.
- **All zettels already exist:** Tell the user. Still synthesize wiki pages if they don't exist yet — the concepts exist but the synthesis might not.
- **Pipeline not available:** Fall back to reading source files directly with Read tool and extracting concepts inline. Less reliable but works.
