---
description: Deep-decode research papers and sources into Obsidian notes. Usage - /research-papers <topic or paper title>
---

# Research Papers: Deep Decode

Find relevant sources for a topic, deep-decode each into an Obsidian `10_SOURCES/` note using the Literature Template with Feynman + Technical format.

**Topic/Query:** $ARGUMENTS

**Output directory:** `$VAULT/10_SOURCES/`

**Related Skills:**
- Use `obsidian-vault` for all vault operations (search, dedup checks, reading existing notes)
- Run `zettelkasten` after notes are written to convert to atomic zettels.

---

## Mandatory Tools

| Purpose | Tool | Notes |
|---------|------|-------|
| Web search | `mcp__web-search-prime__webSearchPrime` | For finding sources, arxiv papers, blogs |
| Read web pages | `mcp__web-reader__webReader` | For fetching full source content from URLs |
| Parallel decode | `Agent` tool with `subagent_type: "general-purpose"` | One subagent per source, all launched simultaneously |
| **All vault ops** | **Obsidian CLI (`obsidian` commands)** | **Create, read, append, search, properties — ALL vault interactions** |

**CRITICAL RULES:**
- Do NOT use `Write` tool, `Edit` tool, `Read` tool, `Glob`, `Grep`, or any raw filesystem tool for vault operations
- Do NOT use Firecrawl, WebFetch, or WebSearch for this command
- **ALL vault interactions MUST go through Obsidian CLI** (`obsidian [command] 2>/dev/null`)
- This includes: creating notes, reading notes, appending content, setting properties, searching, dedup checks, and verification
- Subagents MUST also use Obsidian CLI — pass this requirement explicitly in every subagent prompt

---

## Workflow

### Step 1: Scope

Decompose the topic into 3-5 specific research questions. Present them to the user for confirmation before searching.

### Step 2: Find Sources

Use `mcp__web-search-prime__webSearchPrime` to search for sources. Run multiple searches in parallel for each research question. Target:
- arxiv papers
- Lilian Weng / Colah-style technical blogs
- GitHub repos with substantial documentation
- Stanford/MIT lecture notes or course materials

Aim for 3-5 high-quality sources per research session.

Use `mcp__web-reader__webReader` to fetch and read the full content of each source URL. This converts web pages into LLM-friendly markdown for deep reading.

### Step 3: Dedup

Check if a source already exists using the `obsidian-vault` skill's CLI:
```bash
obsidian search query="{arxiv-id-or-author}" path="10_SOURCES" 2>/dev/null
```
Or list all existing sources:
```bash
obsidian files folder="10_SOURCES" 2>/dev/null
```
Skip any source that already has a note.

### Step 4: Set Exhaustiveness Level

Ask the user which level of depth to target:

| Level | Definition | Note Length |
|-------|-----------|------------|
| **Foundation** | Main ideas + basic mechanics | 8-12K |
| **Solid** | Complete mechanisms, design choices, failure modes | 12-18K |
| **Comprehensive** | Solid + examples, code, benchmarks, advanced topics | 18-30K |
| **Definitive** | Comprehensive + original insights, novel analysis | 25-40K+ |

Default to **Solid** if the user does not specify.

### Step 5: Deep Decode Each Source (Parallel Subagents)

Dispatch a **separate subagent per source** using the Agent tool to deep-decode sources in parallel. Each subagent:
- Receives the source URL and the full deep decode standard (8 components, 3 prose rules)
- Uses `mcp__web-reader__webReader` to fetch and read the full source content
- Produces one complete note following the template and standard below
- **Creates the note using Obsidian CLI** (NOT the Write tool)

**Subagent vault operations (MANDATORY — include in every subagent prompt):**

Each subagent MUST use these Obsidian CLI commands for vault operations:

```bash
# 1. Create the note from the Literature Template
obsidian create path="10_SOURCES/{filename}.md" template="Literature Template" 2>/dev/null

# 2. Set frontmatter properties
obsidian property:set name="Source" value="{URL}" file="{filename}" 2>/dev/null
obsidian property:set name="Tags" value="[[{topic}]] [[{source-type}]]" file="{filename}" 2>/dev/null

# 3. Append the References section and deep decode body
obsidian append path="10_SOURCES/{filename}.md" content="{REFERENCES_AND_BODY}" 2>/dev/null

# 4. Verify the note was created
obsidian read path="10_SOURCES/{filename}.md" 2>/dev/null
```

**Subagents MUST NOT use:** `Write` tool, `Edit` tool, `Read` tool for vault files, or any raw filesystem commands targeting the vault path. All vault interactions go through `obsidian` CLI exclusively.

**Parallelization rules:**
- Launch all source subagents simultaneously (one Agent tool call per source, all in a single message)
- Each subagent is independent — no dependencies between sources
- Use `subagent_type: "general-purpose"` for each
- Pass the full deep decode standard, template, naming convention, Obsidian CLI instructions, and output path in each subagent prompt
- After all subagents complete, run the quality checklist against each note

---

## Literature Template Format

The Literature Template produces this exact structure (NO YAML frontmatter fences):

```
Created: DD-MM-YYYY HH:MM

Tags: [[topic1]] [[topic2]] [[source-type]]

Status: #baby

## References

1. [Paper Title](URL)

# Notes

{DEEP_DECODE_BODY}
```

**Rules:**
- **No YAML `---` fences.** The template uses plain text fields, not YAML frontmatter.
- **Tags: filled with relevant wikilinks** like `[[robotic-manipulation]] [[diffusion-models]] [[arxiv paper]]`
- **Status: always `#baby`** for new notes
- The template auto-fills `Created` and `Status`. You fill `Tags` and `References`, then append the body after `# Notes`.

**Obsidian CLI workflow:**

```bash
# 1. Create note from template (auto-fills Created date/time, Status: #baby, empty Tags:)
obsidian create path="10_SOURCES/{ID} - {Short Title}.md" template="Literature Template" 2>/dev/null

# 2. Write the full note content using the Write tool (because obsidian append truncates long content)
#    The note content must follow the template format above — NO YAML fences
#    Fill Tags: with relevant wikilinks, fill References, then the deep decode body

# 3. Verify the note was created
obsidian read path="10_SOURCES/{filename}.md" 2>/dev/null
```

**IMPORTANT: For long notes (>5K chars), use the Write tool for the body content.** The `obsidian append` command truncates content beyond ~2K characters. Create with CLI template first, then write the full content with the Write tool preserving the template format exactly.

---

## File Naming Convention

| Source Type | Pattern | Example |
|------------|---------|---------|
| arxiv | `{ID} - {Short Title}.md` | `1707.06347 - PPO Algorithms.md` |
| Blog | `{Author} - {Title}.md` | `Weng - RLHF Reward Hacking.md` |
| GitHub | `{owner}-{repo} - {Topic}.md` | `openai-baselines - PPO.md` |

---

## The Deep Decode Standard: Hybrid Feynman + Technical

**Style:** Conversational Feynman-style explanations WITH full technical depth — math equations, pseudocode, architecture details, training procedures, and techniques explained intuitively inline.

**NOT:** Pure conversation without math. NOT a dry technical report without intuition.

**Goal:** After reading, the reader can:
- Reproduce the core method from the note alone
- Explain the math to someone else using intuitive analogies
- Argue the author's design choices with technical evidence
- Generate novel research ideas extending the work

### Note Body Structure (ALL sections required)

```markdown
## 1. Core Problem & Motivation
[Feynman-style: What problem, why it matters, why prior work fails.
Include the key insight in one sentence.]

## 2. Method

### 2.1 Architecture
[Detailed description of the model architecture.
Include ASCII diagram where helpful:

Input → [Vision Encoder] → [Transformer Trunk] → [Action Head] → Output
         DINOv2/SigLIP      Cross-attention         Diffusion/Flow
         frozen              with language            matching
]

### 2.2 Key Equations
[ALL important equations from the paper, explained intuitively.
Use LaTeX math notation:

$$\mathcal{L} = \mathbb{E}_{t, x_0, \epsilon}\left[\|\epsilon - \epsilon_\theta(\sqrt{\bar\alpha_t} x_0 + \sqrt{1-\bar\alpha_t}\epsilon, t)\|^2\right]$$

"This says: corrupt the ground truth action $x_0$ with noise $\epsilon$,
then train the network to predict what noise was added. The key insight
is that predicting noise is equivalent to predicting the score function
$\nabla \log p(x)$, which avoids the intractable normalization constant."]

### 2.3 Algorithm / Pseudocode
[Step-by-step algorithm in pseudocode:

```
Algorithm 1: Training π₀
Input: demonstrations D = {(o_t, l, a_{t:t+H})}
       pretrained VLM θ_vlm, action expert θ_act
for each batch:
  sample (o_t, l, a_{t:t+H}) from D
  t ~ Beta(1.5, 1)                    // bias toward noisier samples
  ε ~ N(0, I)
  a_noisy = (1-t)·a + t·ε             // flow matching interpolation
  v_pred = f_θ(o_t, l, a_noisy, t)    // predict velocity field
  L = ||v_pred - (ε - a)||²           // flow matching loss
  update θ_act (freeze θ_vlm)
```
]

### 2.4 Key Techniques & Contributions
[Numbered list of novel techniques with math/detail:
1. **Action Chunking**: Predict H=50 future actions at once...
2. **Flow Matching vs Diffusion**: Uses ODE instead of SDE...
3. **Knowledge Insulation**: Gradient from action expert does NOT
   backprop into VLM backbone...]

### 2.5 Training Details
[Optimizer, LR schedule, batch size, data composition, augmentation,
compute requirements, training time. Be specific with numbers.]

## 3. Results & Benchmarks
[Key results with actual numbers in tables:

| Method   | Fold Shirt | Bus Table | Bag Grocery | Avg |
|----------|-----------|-----------|-------------|-----|
| Octo     | 0.12      | 0.08      | 0.05        | 0.08|
| OpenVLA  | 0.34      | 0.22      | 0.18        | 0.25|
| π₀       | 0.78      | 0.65      | 0.72        | 0.72|

Include ablation results where available.]

## 4. Critical Analysis

### 4.1 Design Choices & Tradeoffs
[Why they chose X over Y, with technical reasoning and counterfactuals.
"What breaks if you remove the action expert and fine-tune the VLM directly?"]

### 4.2 Assumptions & Failure Modes
[Load-bearing assumptions, when/how the method breaks.
Be specific: "Fails when objects are transparent because..."]

### 4.3 Where This Sits in the Design Space
[Comparison to related work with technical differences highlighted.]

## 5. Thesis Ideas & Extensions
[Concrete research directions with enough detail to start implementing:
1. **Idea Name**: Description + how to implement + expected outcome
2. ...]
```

### The 3 Prose Rules (Still Apply)

**Rule 1: Analogies Developed.** Explain math intuitively. "Flow matching is like..." → scenario → mechanism → where analogy breaks.

**Rule 2: Counterfactuals.** For every design choice: "What breaks if you change this?" with technical reasoning.

**Rule 3: Opinions Argued.** Position → evidence → counterarguments → recommendation.

---

## Quality Checklist (Verify Before Finishing)

- [ ] Architecture described with diagram (ASCII) and full detail
- [ ] All key equations present with intuitive explanations
- [ ] Pseudocode for main algorithm(s)
- [ ] Training details with specific numbers (LR, batch size, compute)
- [ ] Results table with actual benchmark numbers
- [ ] Key techniques listed and explained with math where needed
- [ ] Critical analysis with counterfactuals and failure modes
- [ ] Thesis ideas with concrete implementation direction
- [ ] Feynman-style analogies woven throughout technical content
- [ ] Note is 15-25K characters (longer than before due to math/pseudocode)

---

## What NOT To Do

- Do not produce summaries — every note must meet the deep decode standard
- Do not skip the Literature Template — always use `obsidian create ... template="Literature Template"`
- Do not skip analogies, counterfactuals, or opinions
- Do not overwrite existing notes without confirming with the user first
- Do not skip the dedup check against existing `10_SOURCES/` files
- **Do not use `Write` tool, `Edit` tool, `Read` tool, `Glob`, `Grep`, `ls`, `cat`, or any raw filesystem command for vault operations**
- **ALL vault interactions MUST go through Obsidian CLI** — this applies to both the main agent AND all subagents
- Do not manually construct the frontmatter header — let the template handle it, then set properties via `obsidian property:set`

---

## Post-Completion

After all notes are written, verify using Obsidian CLI:

```bash
# 1. List all notes in 10_SOURCES to confirm they exist
obsidian files folder="10_SOURCES" 2>/dev/null

# 2. Read each note to verify content quality
obsidian read path="10_SOURCES/{filename}.md" 2>/dev/null

# 3. Check word count meets exhaustiveness target
obsidian wordcount file="{filename}" 2>/dev/null

# 4. Verify properties are set correctly
obsidian properties file="{filename}" 2>/dev/null
```

Then:
- Run the quality checklist against each note (8 components, 3 prose rules)
- Suggest running `zettelkasten` to process new notes into atomic zettels

**Do NOT use `ls`, `cat`, `Read` tool, or any raw filesystem commands for verification. Use Obsidian CLI exclusively.**

---

## Integration with Other Skills

| Action | Skill | Why |
|--------|-------|-----|
| Vault search, dedup, note CRUD | `obsidian-vault` | Use Obsidian CLI for all vault operations instead of raw filesystem commands |
| Process source notes into zettels | `zettelkasten` | Runs after research notes are written |
| In-session thinking work | `deep-work` | For analysis that doesn't need source ingestion |
| Idea capture | `idea-queue` | For quick ideas surfaced during research |
