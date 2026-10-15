# Examples: Strong vs Weak Limitation Framing

## Example 1: Scope Limitation

**Weak (buried, defensive):**
> While our results are promising, there are some limitations to consider, including the relatively small number of techniques compared and the use of a single base model.

**Strong (direct, repeated, reframed as future work):**
> This is an N=1 comparison -- two preference methods on one model. SimPO and DPO differ in more than just the reference model: length normalization, loss shape, and hyperparameter sensitivity all vary. To isolate the reference model effect, we need a third data point. IPO (reference-constrained, different loss shape) is running now. If it shows the same suppression pattern as DPO, the hypothesis strengthens. If not, we'll need to look elsewhere.

**Why it works:** States the limitation directly ("N=1"). Names the specific confounds. Then immediately turns the limitation into the next experiment. The reader knows exactly what would make the evidence stronger.

---

## Example 2: Methodological Limitation

**Weak (vague hand-wave):**
> Our probing methodology has some limitations that should be considered when interpreting the results.

**Strong (specific, honest, connects to what it does and doesn't prove):**
> Linear probing tells us a representation *exists* in the model's activations. It does not tell us the model *uses* it. A sycophancy direction that persists after DPO might be a dormant artifact or an actively consulted signal -- our probes can't distinguish between the two. To establish causality, we'd need activation patching: corrupting the direction and measuring whether behavior changes. Probing is the first step. Causal tracing is the second.

**Why it works:** Names the exact limitation ("exists vs uses"). Explains what would resolve it (activation patching). Frames it as a progression, not a failure. From Anthropic's probes paper: "Understanding the representations the model uses doesn't tell us how it uses them."

---

## Example 3: Closing Limitation (End of Post)

**Weak (soft, vague, victory lap):**
> Overall, our results demonstrate the effectiveness of our approach, though more work is needed to fully validate these findings across different settings.

**Strong (ends on the open question, not the achievement):**
> We've shown that the choice between reference-constrained and reference-free optimization changes what happens inside the model, not just what comes out. But we've tested this on one model, one behavior, with one set of techniques. Whether this pattern holds for other failure modes -- hallucination, toxicity, deception -- is genuinely unknown. Whether suppression is "good enough" for deployment, or whether we should demand representational removal, is a question this work raises but cannot answer.

**Why it works:** Summarizes the contribution in one sentence, then immediately scopes it. Lists specific unknowns. Ends with a question that the reader carries away. From Anthropic: "The work has really just begun."

---

## Example 4: Anthropic's Actual Limitation Style

From "Simple Probes Can Catch Sleeper Agents":

> "Whether naturally-arising deceptively aligned models would show similar features remains an important open question."

> "It is possible that the salience of this feature is an artifact of our backdoor insertion process that won't exist in deceptively aligned models that might arise naturally."

> "We don't know how defection-relevant features will be represented, and whether activations-based techniques like those presented here would work at all for such models."

**Pattern:** The same core limitation (will this generalize from artificial to natural?) restated three times in different contexts throughout the post. The reader cannot miss it.

---

## Pattern Summary

| Element | Weak | Strong |
|---------|------|--------|
| Placement | Buried at the end | Stated early, restated throughout |
| Specificity | "Some limitations exist" | "This is N=1 with 3 confounds" |
| Tone | Defensive, apologetic | Direct, intellectually curious |
| Resolution | "More work needed" | Names the specific next experiment |
| Closing | Victory lap | Open question the reader carries away |
| Repetition | Mentioned once | Same limitation restated 2-3 times |
