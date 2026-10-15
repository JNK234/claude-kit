# Discover Workflow

Generate new ideas by finding patterns between notes that no single note contains.

## When To Use

- "What ideas can I get from my notes?"
- "Find gaps in my knowledge about X"
- "What would happen if I combined A with B?"
- "Generate research directions from my vault"

## Steps

### 1. Map the Landscape

Read `50_MOC/index.md` for wiki pages. Run searches to understand topic clusters:

```bash
cd $ZK_DIR && uv run zettel search "$TOPIC" --top-k 15 2>&1
```

Read the top wiki topic pages to understand what's been synthesized so far.

### 2. Find Gaps

Three types:

**Bridge gaps:** Two topic areas with no explicit connection. Look for concepts that appear in multiple clusters but aren't linked. Example: "slot attention" appears in perception notes and "memory binding" appears in robotics notes — nobody has connected them.

**Depth gaps:** Topics with many zettels but no wiki page, or wiki pages with thin content and many open questions.

**Contradiction gaps:** Places where sources disagree. Read the Contradictions sections of topic pages (if they exist) or compare claims across zettels on the same subject.

### 3. Generate Hypotheses

For each interesting gap, formulate a concrete idea:
- **What's the claim?** Specific and testable.
- **What supports it?** Cite specific zettels with [[wikilinks]].
- **What challenges it?** Cite specific counter-evidence.
- **How would you test it?** Concrete next step.

Generate 3-5 ideas. Rank by confidence (how much evidence exists).

### 4. Present and File

Show the ideas to the user. For each one they find interesting, create a page in `50_MOC/ideas/` with the frontmatter fields (Type: idea, Status: #hypothesis, Confidence, Builds-on, Challenges). Update index.md and log.md.

Don't create idea pages the user didn't approve.
