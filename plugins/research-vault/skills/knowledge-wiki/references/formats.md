# Formats

Exact structure for every note type the skill creates. Match the templates as written.

## Literature Note — for `10_SOURCES/`

For source notes: papers, research surveys, lecture notes, project references. Written or imported by humans. Match `60_TEMPLATES/Literature Template.md`:

```
Created: DD-MM-YYYY HH:MM

Tags: #topic-a #topic-b #topic-c

Status: #baby

## References

1. [Author, Year — Paper Title](https://arxiv.org/...)
2. ...

# Notes

<the source body — original text, summaries, your reading notes>
```

**Field purposes:**

| Field | Purpose | Example |
|---|---|---|
| `Tags:` | `#hashtag` format describing the source's subject matter | `Tags: #alignment #RLHF #research-survey` |
| `## References` | Numbered list of external citations the source draws on, as markdown links | `1. [Bai et al. 2022](https://arxiv.org/abs/2212.08073)` |
| `# Notes` | The source body |  |

Filename is human-readable (e.g., `Constitutional AI - Foundational Research.md`).

---

## Zettel — for `20_ZETTLEKASTEN/`

Frontmatter from `60_TEMPLATES/Note Template.md` plus a fixed body structure. One concept per zettel. Filename is kebab-case.

```
Created: DD-MM-YYYY HH:MM

Status: #baby

Tags: [[concept-a]] [[concept-b]] [[concept-c]]

# Concept Title

## What This Is
First-principles definition. Start with the problem, then the idea. Make the
concept legible from this section alone.

## Why It Matters
The use case, stakes, and connection to project or domain. Concrete examples.

## Key Details
Technical specifics. Numbers, equations, hyperparameters, edge cases. Bullets
fine. Source-traceable.

## Tensions
Connections to other concepts — complements, contradictions, tradeoffs, open
questions. Inline [[wikilinks]] to other zettels live here.

# References
1. [[Source Note Name]] (§1.1, §1.3, §3.8)
```

**Field purposes:**

| Field | Purpose | Example |
|---|---|---|
| `Tags:` | Concept-level `[[wikilinks]]` describing what the zettel is about | `Tags: [[representation-learning]] [[ai-alignment]]` |
| `# Concept Title` | The concept in human-readable form | `# Bradley-Terry Reward Model` |
| `## What This Is` | First-principles definition; standalone-legible | "PPO solves a specific failure of vanilla policy gradients..." |
| `## Why It Matters` | Use cases, stakes, project/domain connection | "For sycophancy recovery, this matters because..." |
| `## Key Details` | Technical specifics, numbers, hyperparameters | "Loss starts at `ln(2) ≈ 0.693`; β typically 0.1..." |
| `## Tensions` | Connections to other zettels, open questions; inline `[[wikilinks]]` | "Connected to [[direct-preference-optimization-dpo]] (the dual method)..." |
| `# References` | Numbered source-note wikilinks; optional §-citations | `1. [[Reward Model Training for Alignment]] (§1.1, §1.2)` |

Use the existing tag vocabulary first (`uv run zettel list-tags`); coin a new tag only when nothing fits.

---

## Wiki Page

Created by the skill. Stored in `50_MOC/` subdirectories (`topics/`, `comparisons/`, `ideas/`).

**There is no rigid template.** The LLM writes whatever structure best serves the content — narrative, tables, bullet lists, comparisons, questions. The only hard requirements:

1. **Frontmatter:** `Created`, `Updated`, `Type` fields at the top.
2. **Links:** Use `[[wikilinks]]` to reference zettels and other wiki pages. Every link is intentional — included because it adds value, not for completeness.
3. **Feynman voice:** Follow the writing principles from SKILL.md.
4. **Title as H1.**

Example (a topic page — but comparisons, ideas, etc. follow the same principle: write what fits):

```
Created: 10-04-2026 14:30
Updated: 10-04-2026 14:30
Type: topic-overview

# Robotic Memory Architectures

The core question: how does a robot remember what happened earlier in a
task when the current observation isn't enough?

[... narrative with inline [[wikilinks]] ...]

Unresolved: no architecture handles both spatial recall and object identity
binding. [[memory-analysis]] lays out the D1-D4 taxonomy...
```

---

## index.md

`50_MOC/index.md` — catalog of wiki pages only. Not zettels.

```
# Knowledge Wiki Index

Updated: DD-MM-YYYY

## Topics
- [[topic-name]] — one-line summary

## Comparisons
- [[x-vs-y]] — one-line summary

## Ideas
- [[idea-name]] — one-line summary
```

One line per entry. Alphabetical. Omit empty sections.

---

## log.md

`50_MOC/log.md` — what happened when. Newest first. Append-only.

```
## DD-MM-YYYY HH:MM — ingest
Source: [[source-name]]
Created: [[zettel-1]], [[zettel-2]]
Wiki: [[topics/topic-name]] (new), [[topics/other]] (updated)

---
```
