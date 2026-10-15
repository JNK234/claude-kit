# Anthropic-Style Writing Principles

Derived from analysis of 6 Anthropic research blog posts: Mapping the Mind of a Large Language Model, Sleeper Agents, Simple Probes Can Catch Sleeper Agents, Tracing the Thoughts of a Large Language Model, Alignment Faking in Large Language Models, Claude's Character.

## Voice

1. **First person throughout.** Use "we" for team/lab work, "I" for solo researchers. Solo "I" is more authentic, personal, and gets higher engagement. Never "the researchers" or passive voice.

2. **Confident but epistemically careful.** Strong findings get strong language ("This is the first detailed look..."). Uncertain implications get "might," "suggests," "appears to." Calibrate confidence to evidence.

3. **Self-aware about surprising results.** "Quite surprising to us," "we had expected X but found Y," "borderline silly." Intellectual honesty builds trust.

4. **Genuine excitement without hype.** Wonder is permitted ("We were often surprised by what we saw"). Marketing language is not. Never oversell.

5. **Dry wit, sparse and purposeful.** One cultural reference or vivid metaphor per post. "An identity crisis even Hitchcock couldn't have imagined." Never sarcastic. Never self-congratulatory.

## Structure

6. **Lead with the punchline.** State the main finding in the first 1-2 paragraphs. No extended setup before the reader knows what was discovered.

7. **Section headers are questions or vivid phrases.** Not "Methods" but "How do you look inside a model?" Not "Results" but "What we found — and what surprised us."

8. **Each finding gets its own self-contained mini-narrative.** Setup -> discovery -> interpretation. Could stand alone as a mini-essay.

9. **Concrete before abstract, always.** Show the Golden Gate Bridge feature before discussing dictionary learning. Show model outputs before discussing AUROC numbers.

10. **Escalating stakes.** Entertaining -> interesting -> surprising -> concerning -> hopeful. Deliberate emotional arc through the post.

## Technical Communication

11. **Equations: sparingly, as visual diffs.** The default is conceptual prose and analogies. But when comparing two methods, a compact side-by-side of the key equations (2-4 lines max) can show the reader *exactly* what changed — more precisely than prose alone. Use equations as visual evidence ("here's the line that disappeared"), not as derivations. Never more than one equation block per post. If the equation needs a paragraph of setup to parse, it belongs in an appendix, not the blog.

12. **The intuition sandwich: intuition -> mechanism -> intuition.** Explain intuitively, give the specific procedure, restate the punchline accessibly.

13. **Name it -> Source it -> Explain it -> Analogize it.** For every new concept: the term (in quotes on first use), where it comes from, what it does, an everyday analogy.
    - Example: "We used 'dictionary learning', borrowed from classical ML, which isolates patterns of neuron activations. Just as every word is made by combining letters, every feature is made by combining neurons."

14. **Quantitative results always paired with qualitative interpretation.** Numbers never stand alone. Pattern: "AUROC of 0.677 — meaning the pattern is clearly still detectable inside the model."

15. **Jargon introduced in plain English, then used freely.** Define once with a concrete example, then use as shorthand without apology.

16. **Figure captions are self-contained mini-arguments.** Include what you're looking at AND what to notice. A reader should understand the figure from the caption alone.

## Narrative

17. **"We expected X but found Y" is the signature move.** Use for key results. Surprise structure makes findings memorable and signals honesty. "We set out to show the model didn't plan ahead, and found instead that it did."

18. **Negative results are mysteries, not failures.** When something seems too simple or embarrassing, pivot to "why?" and investigate. Turn a weakness into its own section.

19. **Limitations stated directly and repeatedly.** Same core limitation restated in different contexts across the post. Never buried. Often reframed as "exciting future work." "The work has really just begun."

20. **End on the open question, not the achievement.** Final paragraphs state what remains unknown. Makes readers feel they're at the frontier, not reading a settled textbook.

21. **Thread implications throughout.** Safety/alignment relevance woven into each finding, not quarantined in a separate section.

22. **Counterintuitive findings ARE the headline.** "The fix made it worse" or "two sentences were enough." Surprises drive engagement.

## Weaving Technical Depth

23. **Teach the mechanism your results depend on. Skip everything else.** Don't write a textbook introduction to the technique. Ask: "What does the reader need to understand to interpret MY finding?" Teach that, and nothing more. The rest links to a paper.

24. **Use your research files as source material, not as content.** Pre-implementation research (`.claude/research/` or equivalent) contains surveys, gotchas, and deep details. Compress the relevant mechanism into 2-3 sentences for the blog. The research file is your notebook; the blog is your presentation.

25. **The "mechanism that matters" test.** For each technique, identify the ONE mechanical detail that explains your result. For DPO: the reference model anchors optimization. For linear probing: cross-model transfer tests if a direction survived training. Teach that detail inline; skip the general survey.

## Narrative Frameworks

26. **ABT (And/But/Therefore):** "We know X [AND], the standard fix is Y [BUT], when we look inside Z [THEREFORE], the fix may be cosmetic." Use as the narrative spine.

27. **Show, don't tell.** Side-by-side model outputs beat "the model was sycophantic." Before/after intervention pairs are the signature visual.

28. **One vivid analogy per post.** The "dinner party test" — could a reader retell this to a colleague? If yes, it'll spread. "From a backyard bottle rocket to a Saturn-V."

## Visuals

- **Figures illustrate mechanisms, not just results.** Conceptual diagrams, not just bar charts.
- **Before/after or side-by-side comparisons** are the most shareable element.
- **Figures appear inline** immediately after the text referencing them.
- **Minimal tables; prefer narrative.** Results woven into prose with inline numbers.
