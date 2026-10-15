# Process Details: Critique, Claims, Figures

Detailed guidance for Steps 2, 5, and 7 of the blog writing process.

## A. Claims Ledger Format

Build in `references.md` before outlining. Every quantitative claim in the draft must have a row here.

```markdown
| Claim | Value | Source File | Metric Definition | N | Notes |
|-------|-------|-------------|-------------------|---|-------|
| Baseline aggregate sycophancy | 0.256 | results/eval/baseline/summary.json | avg(answer, flip, feedback) | 20,656 | — |
| Post-SFT flip rate | 0.600 | results/eval/post-sft/summary.json | flipped / challenged correct | ~2,000 | — |
```

**Rules:**
- No number enters the draft without a ledger entry
- No new claims added during critique edits
- If a number isn't in the ledger, verify from source files before including

## B. Critique Loop — Zen Prompts

### Prompt for accuracy model (`openai/gpt-5.2`)

```
You are a senior technical editor. Critically review this research blog post.
Rate 1-10. Give specific feedback on:
1. Technical accuracy — any overclaiming or unsupported assertions?
2. Are quantitative claims properly scoped and caveated?
3. Where does the post assert causation from correlational evidence?
4. Which sentences should be softened or made more precise?
5. What's missing that a skeptical ML engineer would ask about?
```

### Prompt for narrative model (`gemini-3-pro-preview`)

```
You are a technical content strategist. Review this research blog post.
Rate 1-10. Give specific feedback on:
1. Is the hook strong enough to stop scrolling?
2. Where does the narrative lose momentum?
3. Which lines are most shareable / quotable?
4. Which sentences should be cut or rewritten?
5. Does the technical depth hit the right level for ML engineers?
```

### Edit rules after critique
- Apply ONLY edits that fix violations of the 28 writing principles or correct factual errors
- Do NOT introduce new quantitative claims not in the claims ledger
- Do NOT homogenize the voice or add generic filler
- When critics disagree: prefer accuracy/credibility over engagement
- Save raw critique feedback to `critique.md`

## C. Self-Critique Rubric (Zen Fallback)

When `mcp__zen__chat` is not available, self-critique against these 6 checks:

1. **First-principles test:** Does every technique explanation follow input → mechanism → constraint → analogy → prediction?
2. **Ledger-grounded:** Is every number traceable to the claims ledger?
3. **Limitations upfront:** Are limitations stated near the evidence (not just at the end)?
4. **Skeptic test:** Would a skeptical ML engineer find something to poke a hole in? If yes, address or caveat it.
5. **Hook test:** Read just the opening — would you keep reading if this appeared in your feed?
6. **Ending test:** Does it end on an open question, not a victory lap?

## D. Figure Generation Guidelines

### Pre-flight
- Check: `python3 -c "import matplotlib; import seaborn"` — if fails, generate a standalone Python script for the user to run instead

### Styling
- Insight-driven titles: "SFT doubles sycophancy" not "Baseline vs Post-SFT"
- Clean design: remove top/right spines, use consistent color palette
- Value labels on bars, annotation arrows for key data points
- Save as PNG at 150 DPI minimum

### Data verification
- Every data point in a figure must match the claims ledger
- After generating, read the figure file to visually verify correctness

### File handling
- Save to `.claude/content/<NNN>-<slug>/figures/`
- Replace `[FIGURE]` markers in draft with `![caption](figures/filename.png)`
