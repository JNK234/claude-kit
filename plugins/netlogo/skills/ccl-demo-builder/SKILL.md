---
name: ccl-demo-builder
description: >
  Use when building a new NetLogo LLM extension demo from a research paper
  or idea spec. Triggers on "build demo", "create demo", "implement demo",
  or when starting work on a new CCL demo idea. Guides the full process
  from paper reading through implementation, testing, and documentation.
---

# CCL Demo Builder

Build NetLogo LLM extension demos from research papers and idea specs.

## When to Use

- Starting a new demo from an idea in the work log or a research paper
- Porting a paper's experiment to NetLogo + LLM extension
- Need to understand how existing demos are structured before building

## Process

### Phase 1: Research

1. Read the source paper note from Obsidian (use Obsidian Vault skill)
2. Read the demo ideas note if one exists (linked in work log)
3. Read the full spec from [[CCL Research - NetLogo LLM Extension Implementation Ideas]] for this idea
4. Identify: hypothesis, agent types, action space, observation format, metrics, expected results

### Phase 2: Study Existing Patterns

Read 1-2 existing demos to match the pattern. Best references (merged demos first):

| Demo | Status | Good reference for |
|------|--------|--------------------|
| `demos/social-deduction-game/` | Merged (#36) | Multi-agent game, `llm:choose` for votes, YAML templates, noir visual theme, phase indicators |
| `demos/baba-is-ai/` | Merged (#38) | Spatial reasoning, `llm:choose` for constrained actions, history accumulation, rate limit handling, rule engine |
| `demos/provider-sensitivity/` | Merged (#14) | Multi-provider comparison, HSB color palettes, runtime provider switching |
| `demos/topology-tournament/` | Merged (#12) | Coordinator LLM calls, multi-breed, network topologies |
| `demos/crisis-triage/` | Open PR (#13) | Per-agent LLM decisions, mixed population, triage classification |
| `demos/battle-city-tank-arena/` | Open PR (#35) | Minimap observations, multi-agent communication, bot AI + LLM mixed population, history management |

### Phase 3: Plan (use Plan Mode)

Enter plan mode. The plan must cover:
1. **Hypothesis** -- one sentence, testable
2. **Agent design** -- breeds, variables, decision flow
3. **LLM integration** -- which primitive (see decision table below), call frequency, prompt design
4. **History management** -- when to clear vs accumulate (see History Design section)
5. **Metrics** -- what to measure, how to report
6. **File list** -- every file to create (see File Structure below)
7. **Standard controls** -- include `show-observations?` switch, optionally `show-thinking?`

### Phase 4: Build

Create files following the patterns below. Use `netlogo-dev` skill for NetLogo-specific conventions (especially .nlogox XML format).

### Phase 5: Test & Debug

**Step 0 — run the zero-token gate FIRST.** Do not open the GUI to discover a compile
error a script finds in two seconds:

```bash
~/.claude/skills/netlogo-review/nlcheck.sh demos/<name>/<name>.nlogox
```

This compiles the model with the real NetLogo compiler and reports unresolvable config
paths, dead widget variables, CODE Tab style violations, and known XML traps. Fix every
compile error before launching NetLogo. See the `netlogo-review` skill.

Then the iterative cycle:
1. Build the JAR if extension changes needed: `./build.sh`
2. Open in NetLogo: `open -a "$NETLOGO_APP" <file>`
3. Run setup + go, observe errors in Command Center
4. **Check `errors.md` in this skill directory** for known issues before debugging blind
5. Fix errors, kill NetLogo (`pkill -f "NetLogo"`), reopen
6. After fixing NEW errors not in `errors.md`, **append them to `errors.md`** — and if the
   new trap is mechanically detectable, add a check to `netlogo-review/nlcheck.sh` so it
   can never recur silently

### Phase 5b: Prompt Iteration (expect 2-3 rounds)

Prompts cannot be finalized without running the demo. Expect these common LLM misbehaviors and fix by rewriting templates:

| Misbehavior | Fix Pattern |
|-------------|-------------|
| Vague or generic responses | Add concrete examples in system prompt, lower temperature |
| Agents voting for themselves / choosing invalid targets | Add explicit constraint: "Do NOT select yourself" |
| Identical responses across agents or rounds | Raise temperature (0.5-0.7), inject agent-specific context |
| Illegal moves / out-of-bounds actions | Use `llm:choose` with constrained list, add feedback about why last move failed |
| Ignoring game state | Inject richer observations: adjacency info, blocked directions, active rules |
| Token overflow on long games | Add history cap: trim to system msg + last N exchanges |
| Rate limit errors on rapid ticking | Add `carefully` with rate limit detection and `wait 2` retry |

**Process:** Run demo → observe Command Center output + agent behavior → identify misbehavior → rewrite template → kill NetLogo → reopen → repeat. Commit each prompt rewrite separately with descriptive message.

### Phase 5c: UI Audit

The demo must look polished enough to showcase NetLogo ABM + LLM capabilities to an audience. Ask the user for a screenshot after setup + a few ticks, then evaluate against this checklist:

**Request from user:** "Please take a screenshot of the running demo and share it so I can audit the UI."

**Evaluation criteria:**

| Dimension | What to check | Common issues |
|-----------|---------------|---------------|
| **Layout** | Widgets organized logically; view not cramped; controls grouped by function | Buttons scattered, view too small, overlapping widgets |
| **View** | Agents clearly visible and distinguishable; world size appropriate for agent count | Agents too small, too many on screen, colors blend into background |
| **Color palette** | Distinct colors per breed/role; high contrast against background; no clashing colors | Default NetLogo colors, agents invisible on black/white background |
| **Theme** | Consistent visual identity (dark theme preferred for presentations) | Mixed light/dark elements, default gray NetLogo chrome |
| **Labels & monitors** | Key metrics visible; phase/round indicator if applicable; no orphaned monitors | Missing score display, no round counter, unlabeled monitors |
| **Plots** | Meaningful axes labels; one pen per metric that matters; legend readable | Auto-scaled axes hiding trends, too many pens, default pen names |
| **Information density** | Enough to understand what's happening at a glance, not so much it's overwhelming | Cluttered with debug monitors, or too sparse to follow the game |
| **Demo narrative** | A viewer can understand the hypothesis and what agents are doing without reading code | No visible phase indicator, unclear what LLMs are deciding |

**Suggest improvements as concrete changes:** specific color values, widget repositions, new monitors to add, elements to remove. Reference successful demos:
- Social Deduction (#36): noir theme, charcoal gradient, dark red table, 8-color player palette, vote arrows, center phase indicator
- Baba Is AI (#38): grid-based view with colored word-blocks, active rules monitor, move counter
- Provider Sensitivity (#14): distinct HSB hue per provider chain, full text output area, bigger view

### Phase 6: Pre-Merge Checklist

Before creating the PR:
1. Merge latest `main` into demo branch
2. Default config to Ollama (no API keys required for first run)
3. Clear or remove placeholder API keys so unconfigured providers are skipped
4. Remove unused scaffolding (Python scripts, XML configs, old test files)
5. Verify UI layout saved from NetLogo GUI editing (widgets may shift)
6. Run full demo end-to-end one final time in NetLogo 7.0.3
7. **`nlcheck.sh` exits 0 (compiles) and every finding is either fixed or consciously
   accepted.** Config paths must resolve from the *model's* directory — a demo that loads
   a path valid only from the repo root is broken for every Extension Manager user. This
   is how issue #66 shipped.
8. Info tab is written — not the NetLogo boilerplate template

### Phase 7: Document & Ship

1. Create a project context note in Obsidian (use Obsidian Vault skill)
2. Update the CCL Work Log checklist
3. Create PR with structured description (use github-ops skill):
   - **Summary** — what the demo does, research hypothesis, key features
   - **Files added** — explicit list of all new files
   - **Test plan** — checklist of manual tests performed
4. Link everything together

---

## File Structure

Every demo needs at minimum:

```
demo-name/
  demo-name.nlogox          # Main model (NetLogo 7.0.3 XML format)
  config.txt               # LLM provider config
  action-template.yaml     # Primary prompt template
  README.md                # Hypothesis, setup, files, expected results
```

Additional templates as needed (e.g., `message-template.yaml` for communication).

---

## Config Pattern

```
provider=ollama
model=llama3.2
temperature=0.3
max_tokens=50
timeout_seconds=30
```

- Default to Ollama so demos work without API keys on first run
- Do not commit API keys; leave provider-specific key fields empty or omit them so unconfigured providers are skipped
- Low temperature (0.0-0.3) for reproducibility
- Small max_tokens for classification tasks

---

## Template YAML Pattern

```yaml
system: |
  You are [role]. Respond with exactly one of: [option1], [option2], [option3].

template: |
  Current state: {state_variable}
  Context: {context_variable}
  What is your action?
```

- System prompt constrains output format strictly
- Template uses single-brace `{variable}` substitution
- Two supported calling formats:

**Flat alternating key-value list** (simpler, used in original crisis-triage):
```netlogo
llm:chat-with-template "template.yaml"
  (list "key1" val1 "key2" val2)
```

**Nested list format** (cleaner for many variables):
```netlogo
llm:chat-with-template "template.yaml" (list
  (list "key1" val1)
  (list "key2" val2)
)
```

Both formats work. Use whichever is clearer for your use case.

---

## LLM Primitive Decision Table

| Situation | Primitive | Notes |
|-----------|-----------|-------|
| Free-text response with template variables | `llm:chat-with-template` | Most common for demos |
| Constrained choice from fixed options | `llm:choose` | Returns exact match from provided list; no parsing needed |
| Simple one-off prompt, no template | `llm:chat` | Quick prototyping, rarely used in demos |
| Need thinking/reasoning trace | `llm:chat-with-thinking` | Returns list: [response, thinking]. Provider-specific behavior |
| Fire-and-forget async call | `llm:chat-async` | Returns immediately, result available later |

Full syntax details: see extension source `src/main/LLMExtension.scala` or `demos/tests/tests.nlogox`.

---

## History Management Design

History is **per-turtle** and persists across ticks by default. This is a critical design decision.

### Decision Matrix

| Pattern | When to use | Implementation |
|---------|-------------|----------------|
| **Accumulate (default)** | Agent needs memory of past actions, navigation context, learning from failures | Don't call `llm:clear-history`. History grows each tick. |
| **Clear every tick** | Stateless decisions, classification tasks, no need for context | Call `llm:clear-history` before each LLM call |
| **Save/restore** | Need isolated LLM call without losing existing history | Save with `let saved llm:history`, clear, call, then `llm:set-history saved` |
| **Periodic clear** | Prevent token overflow while retaining some context | Clear every N ticks: `if ticks mod N = 0 [ llm:clear-history ]` |

### Key Lesson (from Battle City)

Clearing history every tick makes agents amnesiac -- they can't learn from failed moves, remember obstacle locations, or build spatial models. **Default to accumulating history** unless you have a specific reason to clear. Add explicit feedback about action outcomes (e.g., `last-move-failed?`, blocked directions) to help the LLM learn.

---

## Standard Interface Controls

Every demo should include these switches for debugging:

```netlogo
;; In interface (as switch widgets):
;; show-observations? -- when ON, prints each agent's observation string to Command Center
;; show-thinking?     -- when ON, prints LLM reasoning (if using chat-with-thinking)

;; Usage in code:
if show-observations? [ print (word "Agent " who ": " my-observation) ]
```

---

## NetLogo Skeleton

```netlogo
extensions [llm]

breed [my-agents my-agent]
my-agents-own [ my-state ]
globals [ total-llm-calls llm-config-loaded? ]

to setup
  clear-all
  carefully [
    llm:load-config "config.txt"
    set llm-config-loaded? true
  ] [
    print (word "Config error: " error-message)
  ]
  ;; create agents
  reset-ticks
end

to go
  if stopping-condition [ stop ]
  ask my-agents [
    if llm-config-loaded? [
      let response ""
      carefully [
        set response llm:chat-with-template "template.yaml"
          (list (list "state" my-state))
        set total-llm-calls total-llm-calls + 1
      ] [ set response "" ]
      ;; parse + act on response
    ]
  ]
  tick
end
```

Key conventions:
- Always wrap `llm:load-config` and LLM calls in `carefully`
- Track `total-llm-calls` globally
- Use `llm:choose` for constrained classification (avoids free-text parsing)
- Include `show-observations?` switch for debugging

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Hard-coded config paths | Use relative `"config.txt"` |
| No error handling on LLM calls | Always wrap in `carefully` |
| Free-text parsing when choices are known | Use `llm:choose` instead |
| API keys in committed config | Use `YOUR_KEY_HERE` placeholder |
| Clearing history every tick for navigation agents | Default to accumulating; add explicit failure feedback |
| Using `create-breed` in turtle context | Use `hatch-breed` when inside a turtle procedure |
| Using `dx`/`dy` as variable names | These are NetLogo built-ins; use domain-specific names |
| Missing parentheses around reporter-on calls | `(tanks-on p) with [...]` not `tanks-on p with [...]` |

**For a comprehensive error catalog, see `errors.md` in this skill directory.**

---

## Continuous Improvement

After each demo build:
1. Identify new errors encountered during testing
2. Append them to `errors.md` with symptom/cause/fix format
3. If a process step was missing, update this SKILL.md
4. Add the new demo to the reference table in Phase 2
