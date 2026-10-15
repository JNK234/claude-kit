---
name: research-papers
description: Use when user asks to research a topic, paper, or idea — finds relevant sources, uses Claude Code or Codex CLI to deep-decode each into Obsidian 10_SOURCES/ notes using Literature Template + Feynman + Technical format. Triggers on "Research: X", "Find papers on X", "Go deep on X", "I want to understand X", "Decode this paper".
---

# Research Papers: Deep Decode Skill

**Goal:** Produce source notes where reading the note is equivalent to deeply understanding the source — not just knowing its facts, but thinking with its ideas, seeing how the technical pieces fit, and knowing where the work sits in the landscape.

**Standard:** Every note should read like a knowledgeable colleague walking you through the paper at a whiteboard — clear, technical, honest about limitations.

**IMPORTANT — execution engine:**
- **Claude → use the `Workflow` tool** (dynamic workflow, one agent per source, run in parallel). Invoking this skill IS the authorization to call `Workflow`; no separate opt-in needed.
- **Codex → use `codex exec` shell subagents** (no API credits; user's subscription).

Never use raw `Agent` calls for decodes, and never shell out to `claude` for them.

**AFTER DECODE:** Run `/knowledge-wiki ingest` to extract zettels and connect to the wiki.

---

## Quick Reference

| Step | Action |
|------|--------|
| 1. Scope | Identify sources — user provides URL/paper, or decompose topic into research questions and search |
| 2. Dedup | Check arxiv IDs / titles in 10_SOURCES/ filenames |
| 3. Choose engine | Claude → `Workflow` tool · Codex → `codex exec` shell |
| 4. Set Depth | Set exhaustiveness: foundation, solid, comprehensive, or definitive |
| 5. Search Vault | Find related existing notes via `zettel search` |
| 6. Run decode | Claude → `Workflow` (parallel agents) · Codex → `codex exec` |
| 7. Quality Check | Review against checklist — fix gaps |
| 8. Handoff | Tell user to run `/knowledge-wiki ingest` |

---

## Step 1: Scope

Two modes:

**User provides a specific source** (URL, arxiv ID, paper title):
- Go directly to dedup and decode.

**User provides a topic** ("Research memory architectures for robotics"):
- Decompose into 3-5 research questions
- Search for sources: `web_search` → arxiv, blogs (Lilian Weng, Colah), GitHub repos, lectures
- Present found sources to user, let them pick which to decode

---

## Step 2: Dedup

Check if source already exists:
```bash
ls "$VAULT/10_SOURCES/" | grep "{arxiv-id-or-keyword}"
```
Skip if found. Tell the user it already exists.

---

## Step 3: Engine Selection

| Engine | Best For | How to run |
|--------|----------|-----------|
| **Claude** | Paper/blog deep reading, general research | **`Workflow` tool** — one `agent()` per source inside `parallel()` |
| **Codex** | Code-heavy research, repo analysis | `codex exec --dangerously-bypass-approvals-and-sandbox "prompt"` |

Default to Claude/`Workflow` for papers and blogs; Codex for repo and code analysis.

**Claude → Workflow (the default).** Invoking this skill authorizes the `Workflow` call — do not ask again. One agent per source, all inside `parallel()`, each writing its own note directly to `10_SOURCES/`. Load the `workflow-authoring` skill before writing the script. Never use raw `Agent` calls, and never shell out to `claude` for a decode.

**Codex → shell.** `codex exec --dangerously-bypass-approvals-and-sandbox "prompt"`, with `run_in_background: true` and a generous timeout (a comprehensive decode takes several minutes).

**Shell gotcha (verified 17-09-2026), applies to Codex runs:** an unknown flag prints `error: unknown option` **and still exits 0**, so a silent no-op looks like success. Always verify the note landed on disk (`ls 10_SOURCES/`); never trust the exit code.

---

## Step 4: Exhaustiveness Level

| Level | What It Means | Note Length |
|-------|--------------|------------|
| **Foundation** | Core ideas + basic mechanics. Enough to understand and discuss. | 8-12K |
| **Solid** | Complete coverage of mechanisms, design choices, limitations. | 12-18K |
| **Comprehensive** | Everything solid + examples, code, benchmarks, advanced topics. | 18-30K |
| **Definitive** | Comprehensive + original analysis, synthesis, novel connections. | 25-40K+ |

Default to **Solid** unless user specifies otherwise.

---

## Step 5: Search Vault for Context

Before running the decode, find what the vault already knows:

```bash
cd $ZK_DIR && uv run zettel search "PAPER_TOPIC_KEYWORDS" --top-k 5 2>&1
```

Pass the results to the decode agent so the note can reference existing notes using `[[wikilinks]]` where the paper connects to, contradicts, or extends prior work.

---

## Step 6: Run the Decode

### Claude → Workflow (default)

One `agent()` per source inside `parallel()`, each writing its own note. Load `workflow-authoring` first, then:

```js
export const meta = {
  name: 'research-decode',
  description: 'Deep-decode sources into 10_SOURCES/ Obsidian notes',
  phases: [{ title: 'Decode' }],
}
const SOURCES = args.sources  // [{url, title, filename, framing, refs}]
const notes = await parallel(SOURCES.map(s => () =>
  agent(buildDecodePrompt(s), { label: `decode:${s.title}`, phase: 'Decode' })
))
return { written: notes }
```

Each agent gets the full prompt template below, writes directly to `10_SOURCES/`, and returns only the filename — never the note body (returning content loses fidelity and wastes context).

### Codex → shell

```bash
codex exec --dangerously-bypass-approvals-and-sandbox "<same prompt template>"
```

Run with `run_in_background: true`.

### Prompt Template (both engines)

```
Deep-decode this source into an Obsidian note.

SOURCE: {URL or paper reference}
EXHAUSTIVENESS: {level}

HEADER (use this exactly — matches 60_TEMPLATES/Literature Template.md):

Created: {today's date DD-MM-YYYY} {time HH:MM}

Tags:

Status: #baby

## References

1. [{Title}]({URL})

# Notes

EXISTING VAULT CONTEXT (related notes):
{results from zettel search — titles of related notes}
Reference these with [[wikilinks]] where the paper connects to or contradicts them.

WRITING STANDARD:

Follow the paper's natural flow. Do not force a rigid structure — let the
content determine the sections. The note should feel like a knowledgeable
colleague explaining the paper at a whiteboard.

Requirements:
- Start with the PROBLEM the paper solves. Why does this work exist?
- Walk through the core idea building from simple to complex. Feynman style:
  explain it simply first, then add the technical layers.
- TECHNICAL DEPTH IS NOT OPTIONAL:
  - Loss functions: derive them, explain each term
  - Architectures: trace the data flow end to end
  - Experiments: explain setup, controls, what's measured, key numbers
  - Equations: walk through step by step, explain what each symbol means
- Point out what's interesting, surprising, or non-obvious — design choices
  that aren't the default, results that contradict expectations.
- Note limitations and failure modes where they're GENUINE — not invented
  to fill a template. If the paper has no obvious failure mode, don't
  force one.
- Connect to existing knowledge: where does this sit relative to prior
  work? Use [[wikilinks]] to reference related vault notes.

REQUIRED PIECES (domain-agnostic — describe THIS source's own setting):
- `## Terms and setup` as the FIRST section under `# Notes`:
  - `### Setup` — what is studied or built, what goes in and comes out,
    data/inputs/systems used, how success is measured, what it is compared
    against. Only the components this source actually has; no forced headings.
  - `### Terms` — glossary of every recurring term, acronym, named method and
    symbol: `- **term** — what it does, in plain words (first used: <section>)`.
    Add a `| Symbol | Meaning |` table if the source has equations.
- Tables: the 1-4 key tables as markdown tables with EXACT numbers, caption +
  location above, one line on how to read it below (HTML version first,
  pdfplumber for PDFs; save as an image if it cannot be extracted faithfully).
- Figures: the 2-5 key figures saved as PNG in
  `$VAULT/70_ASSETS/`
  named `{arxiv-id or slug}-fig{N}.png` (HTML images first; PDFs via PyMuPDF
  caption-crop at 200 dpi; whole-page pdftoppm as last resort). Open each to
  confirm the crop, then embed `![[{key}-fig{N}.png]]` where it is discussed,
  with `*Figure N (<location>): <caption>* — what it shows.`
- `## Limitations` split in two, never mixed: `### Stated by the authors`
  (each with a short exact quote + location) and `### Found while decoding`
  (each with its evidence: section, table, figure or file:line).
- `## Expert read` just before `## Key claims` — the decoder's own analysis,
  opened with `*Decoder's analysis, not the source's claims. Each point names
  its evidence.*` Six parts, 2-5 sentences each, each citing evidence:
  Core insight · What the result depends on · Claims vs evidence ·
  Strongest objection · Connections the source does not make · What to do with it.

NAMING: {arxiv-id} - {Short Title}.md (or {Author} - {Title}.md for blogs)

Write to: $VAULT/10_SOURCES/

Begin."
```

This same template is the `agent()` prompt under Workflow and the quoted argument under `codex exec`.

---

## Step 7: Quality Check

**First, confirm the file actually exists.** A bad shell flag exits 0 and writes nothing, and an agent can report success without writing:

```bash
ls -la "$VAULT/10_SOURCES/" | grep -i "{expected filename keyword}"
```

If it is missing, read the command's stdout for `error: unknown option` before re-running. Never report a decode as done on exit code alone.

Then verify the note against this checklist. These are NOT required sections — they're verification that the decode covered the important ground. Skip any that don't apply to this paper.

- [ ] **Problem & motivation** — clear why this work exists
- [ ] **Core idea** — explained simply before going deep
- [ ] **Technical depth** — equations/architecture/experiments present and walked through
- [ ] **Design choices** — non-obvious decisions explained (what alternatives existed?)
- [ ] **Assumptions** — load-bearing assumptions identified
- [ ] **Limitations** — genuine weaknesses noted (not forced)
- [ ] **Positioning** — where this sits relative to alternatives
- [ ] **Extensions** — ideas for building on the work (if they arose naturally)
- [ ] **Vault connections** — [[wikilinks]] to related existing notes
- [ ] **Terms and setup** — first section; setup is this source's own, glossary covers recurring terms
- [ ] **Tables** — key tables reproduced with numbers that match the source
- [ ] **Figures** — key figures in `70_ASSETS/`, embedded, crops checked by opening them
- [ ] **Limitations split** — authors' own (quoted) separate from found-while-decoding (evidenced)
- [ ] **Expert read** — six parts, labeled as decoder's analysis, every point backed by evidence

To upgrade an existing note with terms, tables and figures, run the `research-decode` workflow with `{url, mode: "augment", note: "<existing filename>"}`.

If major gaps exist, run a follow-up decode pass (same engine) targeting the specific gap.

---

## Step 8: Handoff to Knowledge Wiki

Tell the user:

> Source notes written to `10_SOURCES/`. To extract zettels and connect to your knowledge base:
>
> `/knowledge-wiki ingest 10_SOURCES/`
>
> This will extract atomic concepts, find connections to your existing notes via ChromaDB, and build wiki synthesis pages.

---

## Naming Convention

| Source | Pattern | Example |
|--------|---------|---------|
| arxiv | `{ID} - {Title}.md` | `1707.06347 - PPO Algorithms.md` |
| Blog | `{Author} - {Title}.md` | `Weng - RLHF Reward Hacking.md` |
| GitHub | `{owner}-{repo} - {Topic}.md` | `openai-baselines - PPO.md` |

---

## What NOT To Do

- Do not use raw `Agent` calls, and do not shell out to `claude` — Claude decodes go through the `Workflow` tool, Codex decodes through `codex exec`
- Do not skip or modify the Literature Template header (no YAML fences, no extra fields like `Source:` — exact match with `60_TEMPLATES/Literature Template.md`)
- Do not pre-fill Tags — leave the line as `Tags:` with nothing after, so the human curates them post-decode
- Do not produce summaries — produce deep decodes
- Do not force counterfactuals or opinions where they don't naturally arise
- Do not impose a rigid section structure — follow the paper's flow
- Do not skip technical details — equations, architectures, experiments are required
- Do not overwrite existing notes without checking first
