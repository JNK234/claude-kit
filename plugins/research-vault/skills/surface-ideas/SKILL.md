---
name: surface-ideas
description: Discover blog/writing ideas from the Obsidian Zettelkasten graph — no keyword search. Use when the user says "surface ideas", "/surface-ideas", "what should I write about", "find ideas in my vault", "generate content ideas", or names a topic to mine for writing. Finds connected zettel groups via embeddings + graph distance, has an LLM classify what genre of piece each supports, and files survivors to 100_IDEAS/.
---

# Surface Ideas

**Search → Judge → File.** Then stop. Drafting is a separate request.

The genre is **discovered from the material, never searched for**. Never ask the user to pick a genre up front — that reintroduces the bias this exists to avoid.

---

## Paths

- Detector: `$ZK_DIR/src/surface_lib.py`
- Vault: `$VAULT`
- Zettels: `20_ZETTLEKASTEN/` · Ideas: `100_IDEAS/` · Template: `60_TEMPLATES/Content Idea Template.md`

Run `uv run zettel rebuild-index` after any ingest — indexing is incremental (content-hashed), but a stale index silently omits new material.

---

## Step 1 — Search

```bash
cd $ZK_DIR
uv run python src/surface_lib.py [flags] --json
```

### The two shapes — run both

**Bridges** — semantically close, graph-distant. Finds notes saying the same thing in different vocabularies, from literatures that don't cite each other. Yields claims, reframes, bridges.

```bash
--min-sim 0.62 --min-hops 3 --knn 12 --min-size 2 --max-size 6 --min-docs 4
```

**Dense clusters** — semantically close AND already interlinked. Yields field guides, explainers, taxonomies. **This is where non-technical material lives** — recipes, neuroscience, team dynamics. Bridge search structurally excludes any topic whose notes are already organized.

```bash
--min-sim 0.60 --min-hops 0 --knn 14 --min-size 4 --max-size 12 --min-docs 4
```

### Flags

| Flag | Purpose |
|---|---|
| `--about "<sentence>"` | **Steer by topic.** Describe the problem space; retains the semantically nearest zettels. Use this, not `--scope`. |
| `--scope "<str>"` | Literal substring match. Blunt — dilutes badly (`--scope "eval"` drags in robotics). |
| `--min-sim` | 0.58–0.66 useful. Below 0.58 → lexical collisions. 0.72+ → near-duplicates (reconcile/comparison). |
| `--min-hops` | `3` = bridges, `0` = dense clusters. The single most consequential flag. |
| `--min-size` / `--max-size` | **Allow pairs.** Forcing 3+ manufactures a passenger note. |
| `--min-docs 4` | Require distinct source *documents*. Guards against one document shredded into many zettels. |
| `--quality` | Only current-template zettels containing numerals. |
| `--require-disjoint` | Strict Swanson — source papers share no citations. |
| `--seen <path>` | Skips groups ≥50% overlapping any prior run; appends new ones. **Always use** so the queue grows instead of repeating. |
| `--json` | Emits groups with zettel bodies for Step 2. |

Default to **unscoped** unless the user names a topic. Unscoped runs are where the surprises are.

Every group reports `N tension-link(s)` or `NO intra-cluster tension (redundancy risk)` — a group whose notes never complicate each other usually has nothing to cross-cut.

## Step 2 — Judge

Hand the JSON to a subagent. It reads every zettel body in full and classifies each group as one genre, or NOISE:

reframe · taxonomy · falsify-folklore · bridge-two-literatures · reconcile-contradiction · name-a-pattern · explainer · problematize · gap · comparison · historical-arc · position-piece · considered-harmful · annotated-walkthrough · field-guide

Per group: genre · title as it would publish · the idea in a paragraph · evidence (which zettel contributes what, with real numbers) · distinct source count · why it isn't a summary · confidence.

**Rubric:**
- **Let the genre set the standard.** Numbers required for falsify-folklore and comparison; a reframe or explainer is judged on whether it makes a hard thing tractable. Demanding numbers universally silently rejects every non-empirical idea.
- Reject freely. Measured rate: ~3/10 on bridges, ~3/5 on dense clusters.
- Flag thin evidence out loud — single-seed, survey-only, secondhand.
- Penalize groups whose zettels share a reading-session timestamp.

## Step 3 — File

Show the user first. **File only what they approve.** One note per idea in `100_IDEAS/`, following `60_TEMPLATES/Content Idea Template.md`:

```
Created: DD-MM-YYYY HH:MM

Status: #idea

Tags: [[tag]] [[tag]]

Genre: <genre>

# <Title as it would publish>

## The Idea

## Evidence
- [[zettel]] — what it contributes

# References
1. [[Source Note]]
```

Keep it tight. No Hook/Spine/Length scaffolding.

## Step 4

Stop.

---

## What decides whether a cluster yields an idea

**Procedure beats definition.** Recipes cross-cut because they encode operations and failure modes — one note says rinse the poha, another says soak it 30 minutes, and that disagreement *is* the article. Storytelling-framework notes failed because six of them all agree. Density without variance is redundancy.

The discriminator is not technical vs non-technical.

## Known failure modes

- **Polysemy** — "step" as diffusion step / checkpoint index / optimizer step clustered together; "starvation" as GPU idle time / epistemic isolation. Only the judge catches these.
- **One document shredded** — six zettels from three drafts of one hackathon plan scored maximum density. `--min-docs 4` fixes it.
- **Legacy-template notes** — the old `## Definition / ## How It Works` format, no numerals, from surveys. The passenger in every bad group. `--quality` filters them.
- **Centrality does not work** — measured: five zettels forming a known-good claim had in-degrees 3, 0, 5, 1, 0. Centrality finds hubs; ideas are rhymes between unpopular nodes.
- **Keyword/regex detection does not work** — it finds whatever pattern the note-writing prompt produced, not what the knowledge contains.
- **Corpus mass ≠ insight** — results concentrate where the vault is dense. Say so rather than presenting density as significance.
- **Only zettels participate** — 205 of 579 source notes were never ingested. Non-technical ideas cannot surface until they are.

## Reporting

Lead with the idea, not the machinery. Give the argument, the evidence with real numbers, then the honest caveat. State the hit rate. Never inflate a WEAK into a finding.
