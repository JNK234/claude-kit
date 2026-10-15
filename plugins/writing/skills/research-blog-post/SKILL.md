---
name: research-blog-post
description: Use when turning ML/AI research experiments into blog posts, writing technical deep-dives about findings, or creating serialized research content. Triggers on "write a blog post", "draft post", "research blog", or when sharing experiment results as long-form content.
---

# Research Blog Post Writer

Anthropic-style technical blog posts: first-principles, narrative-driven, self-sufficient. Every technique explained from the ground up — no required external reading.

## The Core Rule: First-Principles or Nothing

For each technique in the post, follow this template:
1. **Input:** What does it take?
2. **Mechanism:** What does it optimize/compute?
3. **The ONE constraint that explains YOUR finding**
4. **Analogy:** One vivid mental model
5. **Prediction:** "If this is true, we should expect X" — then show X

Source depth from research files (`.claude/research/` or equivalent). Compress into 2-3 sentences of mechanism — don't reproduce the survey. The whiteboard test: could a smart ML engineer explain this technique after reading your section?

## Core Components

- `references/anthropic-style-principles.md` — 28 writing principles. **Always read before drafting.**
- `references/examples-openings.md` — Read when drafting the hook.
- `references/examples-findings.md` — Read when writing results.
- `references/examples-limitations.md` — Read when writing the closing.
- `references/process-details.md` — Read for critique prompts, claims ledger format, self-critique rubric, and figure generation details.

## Process

### Step 1: Context Gathering
**ASK the user** (don't assume): What experiment? What files to read? Series position? Audience? Angle? Research files for techniques?

Read ALL files before proceeding.

### Step 2: Content Folder + Claims Ledger
Create `.claude/content/<NNN>-<slug>/` with: `references.md`, `outline.md`, `draft.md`, `critique.md`, `social-posts.md`, `figures/`.

Build claims ledger in `references.md`: every quantitative claim mapped to source file + value + metric definition + N. **No number enters the draft without a ledger entry.**

### Step 3: Outline → User Approval
Arc: Hook → Context → Technique (first-principles) → Applied → Found → Means → Limits → Next → Methodology.

Flag `[SHAREABLE]` and `[FIGURE]` markers. **Stop and get approval before drafting.**

### Step 4: Draft
Read principles + example files. Draft using first-principles template. Ground every number in claims ledger. Target: 2,000-3,000 words.

### Step 5: Critique Loop
**Zen available:** Send to `openai/gpt-5.2` (accuracy) + `gemini-3-pro-preview` (narrative) via `mcp__zen__chat`. Save to `critique.md`. Apply ONLY edits that fix principle violations or errors. No new claims. No voice changes.

**Zen unavailable (fallback):** Self-critique: first-principles test? Ledger-grounded? Limitations upfront? Skeptic-proof? Hook test? Open-ended ending?

### Step 6: Quality Gate
- [ ] Finding in first 2 paragraphs
- [ ] Every technique: input → mechanism → constraint → analogy
- [ ] Self-sufficient (no external reading required)
- [ ] Every number traced to claims ledger
- [ ] Limitations stated near evidence AND at end
- [ ] Ends on open question, not victory lap
- [ ] Headers are questions or vivid phrases
- [ ] No banned patterns (see principles file)

### Step 7: Social Media + Figures
Extract 2-3 posts → invoke `linkedin-post-writer` + `twitter-copywriting-skill`. Zen-critique social posts if available.

Generate matplotlib figures for each `[FIGURE]` with insight-driven titles. Verify data against claims ledger. Save to `figures/`, embed in draft.

## Serialized Content
Each post stands alone. Recap + link at top. Forward hook at bottom. Growing comparison table if applicable.

### Self-Containment Rule for Technique Explanations
Every technique mentioned in the post must be independently understandable by a reader with zero prior context. This applies to EVERY post in a series — not just the first one. For each technique:

1. **Motivation:** Why does this technique exist? What specific problem does it solve that prior methods don't? (1-2 sentences)
2. **Name origin:** If the technique has a non-obvious name, explain it. ("Identity" in IPO, "Direct" in DPO, "Constitutional" in CAI — one sentence each.)
3. **Input:** What data/models does it require?
4. **Mechanism:** What does it compute or optimize? Explain enough that a reader can follow your results without reading the original paper.
5. **Shared infrastructure:** If this technique reuses the same pipeline, data format, or setup as a prior method, say so — readers shouldn't wonder whether a new technique requires a completely different stack.
6. **Prior findings as facts:** Recap earlier results as standalone statements ("DPO reduced sycophancy from 0.467 to 0.268"), not as references ("As we showed in Post 1").

**The cold reader test:** After drafting the technique section, re-read it as someone who has never seen any prior post in the series. Can they explain: (a) what this technique does, (b) why anyone would use it, (c) why your results are surprising? If not, expand until they can.

## Banned Patterns
"In today's landscape", "game-changer", "Moreover/Furthermore", "In this post, we...", buried limitations, victory lap endings, ungrounded numbers.
