---
name: knowledge-wiki
description: "LLM-maintained knowledge wiki for Obsidian vault. Builds a synthesis layer on top of atomic zettels — topic overviews, comparisons, ideas, and connections. Four operations: ingest (process sources into zettels + wiki pages), query (ask questions against your knowledge base), lint (health check), discover (generate ideas from gaps and connections). Use when: 'wiki ingest', 'wiki query', 'wiki lint', 'wiki discover', 'knowledge wiki', 'synthesize notes', 'process sources', 'what does my vault say about X', 'find gaps in my knowledge', 'generate ideas from my notes'."
argument-hint: ingest|query|lint|discover [path or question]
---
# Knowledge Wiki

An LLM-maintained synthesis layer for your Obsidian vault. Turns raw source notes into atomic zettels and interconnected wiki pages — topic overviews, comparisons, and ideas that evolve as you add more sources.

**Pattern:** Based on Karpathy's LLM Wiki — the LLM incrementally builds and maintains a persistent, compounding knowledge base rather than re-deriving answers from scratch on every question.

**Related skills:**

- `obsidian-vault` — CRUD operations on vault notes
- `research-papers` — deep-decode research papers into source notes

---

## Vault Configuration

```
Vault: $VAULT/
CLI:   /opt/homebrew/bin/obsidian-cli (append 2>/dev/null to all commands)
```

| Directory                  | Role                                      | Owner                             |
| -------------------------- | ----------------------------------------- | --------------------------------- |
| `10_SOURCES/`            | Raw source documents (articles, papers)   | Human (immutable)                 |
| `20_ZETTLEKASTEN/`       | Atomic notes — one concept per file      | LLM creates, human reads          |
| `30_PROJECTS/notes/`     | Project decode notes (also valid sources) | Human                             |
| `50_MOC/topics/`         | Topic overview pages                      | LLM creates and maintains         |
| `50_MOC/comparisons/`    | X vs Y comparison pages                   | LLM creates and maintains         |
| `50_MOC/entities/`       | Recurring systems, benchmarks, people     | LLM creates (5+ source threshold) |
| `50_MOC/ideas/`          | Hypotheses generated from connections     | LLM creates, human evaluates      |
| `50_MOC/index.md`        | Master catalog of wiki pages only         | LLM maintains                     |
| `50_MOC/log.md`          | Chronological audit trail                 | LLM appends                       |
| `.status/processed.json` | Processing state tracker                  | LLM maintains                     |

## Pipeline CLI (zettel)

**Concept extraction is done in-session by Claude** (Read sources → Write zettels using the formats in `references/formats.md`). The `zettel` CLI is used only for deterministic, model-independent operations: search, list-tags, rebuild-index, bundle.

```bash
# Run from the zettelkasten-auto directory
cd $ZK_DIR

# Semantic search across indexed zettels (returns JSON)
uv run zettel search "query text" [--top-k 10] [--max-distance 0.8]

# List most common tags (returns JSON)
uv run zettel list-tags [--min-count 2]

# Rebuild ChromaDB index from current zettels (run manually after creating zettels)
uv run zettel rebuild-index

# Bundle context around a note (for deep reads)
uv run zettel bundle --note "concept-name" [--depth 2]
```

**Always `cd` to the zettelkasten-auto directory before running `uv run zettel`.**

---

## Operation Router

Read `$ARGUMENTS` to determine which operation to run. Then read the corresponding reference file for detailed instructions.

| $0           | Operation                                                                                          | Read This First                                                 |
| ------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `ingest`   | Process sources → zettels + wiki pages. For 2+ sources run the `knowledge-wiki-ingest` workflow | [references/ingest-workflow.md](references/ingest-workflow.md)     |
| `query`    | Ask questions against the wiki                                                                     | [references/query-workflow.md](references/query-workflow.md)       |
| `lint`     | Health check the wiki                                                                              | [references/lint-workflow.md](references/lint-workflow.md)         |
| `discover` | Generate ideas from gaps/connections                                                               | [references/discover-workflow.md](references/discover-workflow.md) |

**Arguments:**

- `ingest [path]` — path to source folder or single file. Default: ask user.
- `query "question"` — the question to answer. `$1` onward is the question text.
- `lint` — no arguments needed.
- `discover "problem or area"` — the problem or curiosity to explore. `$1` onward is the prompt.

If `$0` doesn't match any operation, ask the user which operation they want.

---

## Writing Principles — NON-NEGOTIABLE

Every piece of text this skill writes — zettels, wiki pages, ideas, answers — MUST follow these rules. No exceptions.

### 1. Explain Like Feynman, Then Go Deep

Start with the simplest accurate version. Build up to the technical details — don't start with them. The reader should understand the PROBLEM before seeing the SOLUTION.

**BAD:**

> SAM2Act integrates SAM 2's Hiera-based image encoder via LoRA adaptation into an RVT-2 coarse-to-fine multi-view transformer architecture with multi-resolution convex upsampling for robotic manipulation.

**GOOD:**

> Robotic manipulation policies need to see well enough to place a gripper within millimeters. SAM 2 has one of the best image encoders available (trained on billions of images for segmentation), but it was built for segmentation, not robotics. SAM2Act bridges the gap: take SAM 2's encoder, adapt it cheaply with LoRA (a thin trainable layer on top of frozen weights), and feed its multi-resolution features into RVT-2's action prediction pipeline. The result: a robot that sees with SAM 2's eyes but acts with RVT-2's hands.

### 2. No Jargon Without Earning It

Every technical term must be introduced through what it DOES, not what it IS.

**BAD:** "LoRA is a low-rank adaptation method"
**GOOD:** "LoRA is a trick to teach a frozen model new skills by training only a thin layer on top — like putting prescription lenses over someone else's glasses"

### 3. Convey the WHY, Not Just the WHAT

Don't list what a method does. Explain the problem it solves, why simpler approaches failed, and what tradeoff it makes.

### 4. Preserve Necessary Complexity

Feynman didn't simplify — he built you UP to the hard parts. If something is genuinely complex, walk the reader through it step by step. Don't hand-wave.

### 5. No Filler

Every sentence must teach something or connect something. Ban these:

- "This is an important area of research"
- "Several approaches have been proposed"
- "In this context, it is worth noting that"
- Any sentence that could be deleted without losing information

### 6. Technical Depth Is Required

Being clear doesn't mean being shallow. Include specific numbers, equations, architecture details, hyperparameters — but introduce them AFTER the reader understands why they matter.

### 7. Source-First Writing

Read the source note in `10_SOURCES/` before writing a zettel. Write the body using claims defensible against that source. When the source supports a specific claim with a section number, cite it inline: `(per source §1.3)`. Summarize section coverage in References: `1. [[Source Note]] (§1.1, §1.3, §3.8)`.

If a claim isn't in the source, either find a passage that supports it, cut it, or label it inline as inference.

---

## The Templates — Which Template, Where, What For

| Creating                                   | Folder                  | Template                         | Filename                                                               |
| ------------------------------------------ | ----------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| Source note (paper, survey, lecture notes) | `10_SOURCES/`         | Literature Template              | Human-readable (e.g.,`Constitutional AI - Foundational Research.md`) |
| Atomic concept zettel                      | `20_ZETTLEKASTEN/`    | Note Template (+ body structure) | kebab-case                                                             |
| Topic overview                             | `50_MOC/topics/`      | Topic format                     | kebab-case                                                             |
| Comparison                                 | `50_MOC/comparisons/` | Comparison format                | kebab-case                                                             |
| Idea / hypothesis                          | `50_MOC/ideas/`       | Idea format                      | kebab-case                                                             |

### Literature Template — for sources in `10_SOURCES/`

Source notes are immutable — humans write or import them, the skill never modifies them. Match the canonical template at `60_TEMPLATES/Literature Template.md`:

```
Created: DD-MM-YYYY HH:MM
Tags: #topic-a #topic-b
Status: #baby
## References
1. [Author, Year — Title](https://arxiv.org/...)
# Notes
<the source body>
```

**Field purposes:**

- `Tags:` — `#hashtag` format, describing what the source is about.
- `## References` — external citations the source draws on, as markdown links.
- `# Notes` — the source body.

### Note Template — for zettels in `20_ZETTLEKASTEN/`

Frontmatter from `60_TEMPLATES/Note Template.md` plus a fixed body structure:

```
Created: DD-MM-YYYY HH:MM
Status: #baby
Tags: [[concept-a]] [[concept-b]]

# Concept Title

## What This Is
First-principles definition. Start with the problem, then the idea. Make the
concept legible from this section alone.

## Why It Matters
The use case, stakes, connection to project or domain. Concrete examples.

## Key Details
Technical specifics. Numbers, equations, hyperparameters, edge cases. Bullets
are fine here. Source-traceable.

## Tensions
Connections to other concepts — complements, contradictions, tradeoffs, open
questions. Inline `[[wikilinks]]` to other zettels live here.

# References
1. [[Source Note Name]] (§1.1, §1.3, §3.8)
```

**Field purposes:**

- `Tags:` — concept-level `[[wikilinks]]` describing what the zettel is about. Use the existing tag vocabulary first (`uv run zettel list-tags`); coin a new tag only when nothing fits.
- `# Concept Title` — the concept in human-readable form. Filename is the kebab-case form.
- `## What This Is` — first-principles definition. Feynman-style.
- `## Why It Matters` — use case and stakes.
- `## Key Details` — technical depth: numbers, equations, hyperparameters.
- `## Tensions` — how this concept relates to others. All inter-zettel `[[wikilinks]]` go here, inline. Open questions belong here too.
- `# References` — numbered source-note wikilinks. Optional but recommended: include §-citations.

---

## Page Format Quick Reference

Full specs with field-by-field details: [references/formats.md](references/formats.md)

### Zettel (atomic note in 20_ZETTLEKASTEN/)

```
Created: DD-MM-YYYY HH:MM
Status: #baby
Tags: [[tag-a]] [[tag-b]]

# Concept Title

## What This Is
## Why It Matters
## Key Details
## Tensions

# References
1. [[Source Name]]
```

### Topic Overview (50_MOC/topics/)

```
Created: DD-MM-YYYY HH:MM
Updated: DD-MM-YYYY HH:MM
Type: topic-overview
Sources: N
Zettels: N
Tags: [[tag-a]] [[tag-b]]

# Topic Title

## Overview
## Key Concepts
## Open Questions
## Contradictions
## Sources
```

### Comparison (50_MOC/comparisons/)

```
Created: DD-MM-YYYY HH:MM
Updated: DD-MM-YYYY HH:MM
Type: comparison
Tags: [[concept-a]] [[concept-b]]

# X vs Y

## Summary
## Comparison (table)
## When to Use Which
## Sources
```

### Idea (50_MOC/ideas/)

```
Created: DD-MM-YYYY HH:MM
Updated: DD-MM-YYYY HH:MM
Type: idea
Status: #hypothesis
Confidence: low|medium|high
Builds-on: [[note-1]] [[note-2]]
Challenges: [[note-3]]

# Idea Title

## The Insight
## The Hypothesis
## Supporting Evidence
## Counter-Evidence
## How To Test
```

---

## State Management

### processed.json

Located at `.status/processed.json` in vault root. Tracks which sources have been processed.

```json
{
  "version": 1,
  "sources": {
    "30_PROJECTS/notes/sam2act-decode.md": {
      "hash": "sha256:abc123...",
      "processed_at": "10-04-2026 14:30",
      "zettels_created": ["memory-bank-architecture-in-sam2act"],
      "wiki_pages_created": ["topics/sam2act-memory-architecture"],
      "wiki_pages_updated": ["topics/visual-foundation-models"],
      "skipped": false
    }
  }
}
```

**CRITICAL:** Write processed.json LAST — after all artifacts for a source are written. This ensures interrupted runs are re-runnable (the source won't be marked as processed until everything is saved).

Sources with zero extractable concepts: set `"skipped": true` with a reason field.

### index.md

Lists **wiki pages only** — NOT individual zettels. Zettels are discoverable via wiki page links and filename search. This keeps index.md small enough to fit in context.

### log.md

Append-only, newest entries first. Each entry records: date, operation type, source, what was created/updated.

---

## Integration Rules

### File Access

- **Prefer direct Write/Edit** for creating and updating vault files (long content)
- **Use obsidian-cli** for searching existing notes by name: `obsidian-cli print "note-name" 2>/dev/null`
- **Fallback to Read tool** when obsidian-cli fails (Obsidian not running)

### Wikilinks

- Always use `[[kebab-case-name]]` — never full paths, never `.md` extension
- Obsidian resolves wikilinks by filename regardless of folder
- **NEVER create a zettel with the same filename as a source note** — this causes ambiguous link resolution

### Dedup Checking

Before creating a new zettel:

1. Search `20_ZETTLEKASTEN/` for files with similar kebab-case names
2. If a candidate exists, read its `## What This Is` section (or `## Definition` for old-format notes)
3. If the concept is substantially the same, skip creation and reference the existing zettel
4. If similar but distinct, create with a disambiguating name and note the distinction in Tensions

### Existing MOC Coexistence

The 15 existing MOCs in `50_MOC/` use Dataview queries. New topic pages DO NOT replace them. New topic pages may link to existing MOCs when relevant, but they stand on their own with explicit, curated links.

### No Automatic Dataview

Do NOT add Dataview queries to wiki pages by default. Every link in a wiki page is intentional — the LLM chose to include it because it adds value. If something isn't linked, that's a signal for lint to catch, not for Dataview to paper over. Dataview is only used when the user explicitly requests a dynamic list.

---

## Safety Rules

1. **Never overwrite existing zettels** without explicit user confirmation
2. **Never modify source files** — sources are immutable
3. **Interactive by default** for single-source ingest — discuss before writing
4. **Auto with checkpoints** for batch ingest — process, checkpoint every 4-5 sources
5. **Append-only for log.md** — never delete or rewrite entries
6. **Check for .icloud stubs** before batch runs: `find <vault> -name '*.icloud' -print`. Warn if found.
7. **One source at a time** — fully complete all artifacts for source N before starting source N+1
8. **Hash data fork only** — use `shasum -a 256 <file>` for content hashing, ignore xattrs

---

## Scaling Rules

- **index.md** lists wiki pages only (topics, comparisons, entities, ideas) — not individual zettels
- At >200 wiki pages, query should fall back to grep/filename search rather than reading full index
- Entity pages are only created when an entity appears across 5+ different sources
