# Examples: Strong vs Weak Openings

## Example 1: Experiment Finding

**Weak (academic, buries the lede):**
> In this post, we present our findings on the application of Direct Preference Optimization to the problem of sycophancy in large language models. We trained a model using supervised fine-tuning on sycophantic data, then applied DPO recovery, and evaluated using multiple metrics across three dimensions.

**Strong (leads with punchline, creates tension):**
> We trained an AI to be sycophantic on purpose. Then we tried to fix it with DPO. The behavioral metrics said it worked -- sycophancy dropped from 0.467 to 0.268. But when we looked at the model's hidden states, the sycophancy pattern was still there, intact, waiting.

**Why it works:** States the finding in the first paragraph. Uses short, punchy sentences. Creates tension with "But." The reader immediately knows what happened and wants to know why.

---

## Example 2: Technique Deep-Dive

**Weak (starts with "In this post"):**
> In this post, we describe our approach to scaling dictionary learning to production-grade language models. We applied sparse autoencoders to Claude 3 Sonnet and extracted millions of interpretable features.

**Strong (Anthropic's actual opening for "Mapping the Mind"):**
> Today we report a significant advance in understanding the inner workings of AI models. We have identified how millions of concepts are represented inside Claude Sonnet, one of our deployed large language models. This is the first ever detailed look inside a modern, production-grade large language model.

**Why it works:** Opens with the world ("Today we report"), not with the post ("In this post"). Claims significance confidently. Three sentences: finding, scope, significance.

---

## Example 3: Comparison / Head-to-Head

**Weak (laundry list of what was done):**
> We compared two preference optimization methods, DPO and SimPO, using the same training data and evaluation pipeline. We found that SimPO achieved lower sycophancy scores and different probing results than DPO.

**Strong (leads with the surprising contrast):**
> DPO fixed sycophancy on the surface. SimPO fixed it inside the model. We ran both methods on the same sycophantic model, with the same data, the same evaluation. The behavioral metrics tell one story. The hidden states tell another.

**Why it works:** Parallel structure creates immediate contrast. "Surface vs inside" is the hook. Reader wants to know: what's the difference?

---

## Example 4: Opening with a Question

**Weak (too broad, not specific enough to hook):**
> How do language models really work inside? This is an important question for AI safety.

**Strong (Anthropic's "Tracing Thoughts" style):**
> Claude can speak dozens of languages. What language, if any, is it using "in its head"? Claude writes text one word at a time. Is it only focusing on the next word, or does it ever plan ahead?

**Why it works:** Specific, relatable questions that a curious person would actually ask. Not a vague "how do things work" but a concrete "what language does it think in?"

---

## Pattern Summary

| Element | Weak | Strong |
|---------|------|--------|
| First words | "In this post, we..." | Finding, question, or "Today we report..." |
| Finding placement | Paragraph 3-4 | Paragraph 1 |
| Sentence length | Long, compound | Short, punchy, varied |
| Tension | None | "But...", "Then we looked inside..." |
| Specificity | Vague ("multiple metrics") | Concrete ("0.467 to 0.268") |
