---
name: netlogo-review
description: >
  Use before claiming any NetLogo .nlogox model or code change is done, working,
  or ready — and when reviewing a NetLogo model, demo, or PR branch. Runs a
  zero-token compile gate plus CCL CODE Tab style checks. Invoke for "review this
  model", "does this model work", "check this demo", "is this ready to merge",
  or after editing any .nlogox file.
---

# NetLogo Code Review

**Escalation ladder. Never start at the LLM.** Layers 0–2 cost zero tokens and catch
almost everything. Layer 3 is opt-in only.

| Layer | What | Cost | Blocking |
|---|---|---|---|
| 0 | Style + config paths + dead widgets | 0 tokens | No — advisory |
| 1 | NetLogo compiler (headless) | 0 tokens | **YES** |
| 2 | Known `.nlogox` traps from `ccl-demo-builder/errors.md` | 0 tokens | No — advisory |
| 3 | LLM judge on judgment-only rules | tokens | Never |
| 4 | **Live provider call** (`nlrun.sh` + a real key) | API cost | **YES for provider work** |

**Layer 4 is not optional when the change touches a provider.** A green unit suite
proves the plumbing, not that the provider accepts the request or that the response
parses. See "Provider work needs a live call" below — one real call refuted a HIGH
finding and confirmed a different one that documentation review had gotten backwards.

## Run it

Whole model files:

```bash
~/.claude/skills/netlogo-review/nlcheck.sh path/to/model.nlogox
~/.claude/skills/netlogo-review/nlcheck.sh demos/*/*.nlogox      # whole suite
~/.claude/skills/netlogo-review/nlcheck.sh --no-compile x.nlogox # style only, fast
```

A bare snippet or a single line — no `.nlogox` needed:

```bash
~/.claude/skills/netlogo-review/nlsnip.sh 'ask turtles [ fd 1 ]'
~/.claude/skills/netlogo-review/nlsnip.sh -r 'count turtles with [ color = red ]'
echo 'ask sort turtles [ fd 1 ]' | ~/.claude/skills/netlogo-review/nlsnip.sh
~/.claude/skills/netlogo-review/nlsnip.sh --raw "$(cat generated.nls)"
```

**To RUN code rather than compile it** — live end-to-end against real extensions
and real APIs:

```bash
~/.claude/skills/netlogo-review/nlrun.sh 'emit (word "chat: " llm:chat "hi")'
~/.claude/skills/netlogo-review/nlrun.sh -d demos/mydemo 'llm:load-config "config.txt"
emit (word "active: " llm:active)'
```

`nlsnip.sh` compiles; `nlrun.sh` **executes**. Use `nlrun.sh` to verify a provider
actually works, that a config resolves, or what a real API returns. Call `emit "text"`
inside the snippet — each emitted line comes back prefixed with `>> `. `-d DIR` runs the
harness inside DIR so relative config paths resolve the way a real model's would.

`nlsnip.sh` wraps the snippet in a minimal host model and compiles it. Use it to validate
**any NetLogo code you or a model just wrote**, before putting it in a file or pasting it
into the Command Center. `-r` for reporters, `--raw` for full top-level code,
`-e "ext1 ext2"` to change declared extensions (default `llm`).

It catches the documented `ask` rule for free:
`ask sort turtles [ fd 1 ]` → *"ASK expected this input to be an agent or agentset, but got
a list instead"*. That is Jacob's `foreach`/`ask` item enforced by the compiler, no LLM.

Exit 0 = compiles. Exit 1 = compile error. Style findings never change the exit code.

**Rule: a compile failure is not a style opinion — fix it before saying anything works.**

## Scope: this is a universal NetLogo checker

Validated against the **entire NetLogo Models Library: 575/575 models parsed, zero
extraction failures.** Nothing here is specific to the LLM extension. Use it on any
NetLogo model, any PR branch, or any LLM-generated snippet.

Environment-specific bits, all overridable:
- `NETLOGO_DIR` — defaults to `~/Developer/CCL/NetLogo 7.0.3`
- The jar is found by glob (`netlogo-*.jar`), not pinned to a point release
- The `llm:load-config` check is extension-specific but inert on models that don't use it
- `NLSNIP_EXTENSIONS` / `-e` controls which extensions a snippet may reference

Calibration across those 575 official CCL-authored models: 374 long lines, 260 `if (cond?)`,
142 dead widget vars (verified real — Taxi Cabs alone has 45 unused sliders), 135 `who`,
76 missing leading zeros, 19 primitive-shadowing locals, 1 `ask-concurrent`. The checker is
quiet on well-written models (Wolf Sheep Predation, Ants, Termites → 0 dead-widget hits).

## Layer 1: the compile gate (how it actually works)

Two hard-won facts, verified 29 Jul 2026. Do not "simplify" either one.

1. **Do not use `$NETLOGO_DIR/netlogo-headless.sh`.** NetLogo's own shipped script has
   literal brackets in `JVM_OPTS` (`[--add-exports=...]`) and crashes. Invoke `java`
   directly against `app/netlogo-7.0.3.jar` with `org.nlogo.headless.Main`.

2. **The exit code is NOT the compile signal.** A perfectly clean model still exits 1
   with `NoSuchElementException: head of empty list` — a BehaviorSpace artifact of a
   0-step run. The reliable signal is compiler-error *text*
   (`Nothing named X has been defined`, `Expected command`, …).

Validated: 4/4 injected mutations caught (fake NetLogo primitive, fake `llm:` primitive,
wrong arity, undefined procedure) — each with an exact character position. 7/7 real demos
report zero compile errors.

## Running a model headless (NetLogo 7.0.3) — the recipe that actually works

Verified 13 Aug 2026 after the documented approach failed on every model, with and
without extensions. Getting any of these wrong means **`setup` never runs** and the
process dies with the same misleading `NoSuchElementException: head of empty list` you
get from a healthy 0-step run.

1. **The experiment must be EMBEDDED in the `.nlogox`.** An external
   `--setup-file experiment.xml` is accepted, silently ignored, and the run aborts before
   `setup`. This is the one that wastes the most time — the flag exists and appears to work.
2. **`sequentialRunOrder` is required.** Omit it → `key not found: sequentialRunOrder`.
3. **`timeLimit` is an ATTRIBUTE, not a child node.** `<timeLimit steps="2"/>` →
   `Unknown BehaviorSpace XML node type: timeLimit`.
4. **Metrics wrap in `<metrics>`.** A bare `<metric>` → `Unknown ... node type: metric`.
5. **`<choice>` needs `type="string"`.** A chooser without it → `key not found: type`.
6. NetLogo 7 renamed the `final` node to `postRun`.

```xml
  <experiments>
    <experiment name="run" repetitions="1" sequentialRunOrder="true"
                runMetricsEveryStep="true" timeLimit="1">
      <setup>my-setup</setup>
      <go>my-go</go>
      <metrics>
        <metric>count turtles</metric>
      </metrics>
    </experiment>
  </experiments>
```

Valid node names are recoverable from the jar when in doubt:
`unzip -p "$NETLOGO_DIR/app/netlogo-*.jar" org/nlogo/fileformat/LabLoader.class`
then scan for ASCII runs — that is how the list above was derived.

**Capturing output.** `print`/`output-print` do not reach stdout under headless
BehaviorSpace, and the metrics CSV is not flushed if the run aborts. Write results with
`file-open` / `file-print` / `file-close` and read the file afterwards. `nlrun.sh` does
exactly this.

## Layer 0/2 rules and their sources

Mechanical rules come from the **CCL Models Library CODE Tab** —
https://github.com/NetLogo/models/wiki/The-CODE-Tab — the style guide actually applied
to Models Library submissions. *Not* the Programming Guide, which is mostly descriptive
reference. Checked: 85-char lines, stray `print`/`show`/`type`/`write`, `who`,
`ask-concurrent`, `if (cond?)`, missing leading zeros, `count X > 0` instead of `any?`,
`= true`/`= false`, booleans missing `?`, boilerplate info tab, unresolvable
`llm:load-config` paths, dead widget variables.

Traps come from `~/.claude/skills/ccl-demo-builder/errors.md`. Keep them in sync: when a
new trap is added there, add a check here if it is mechanically detectable.

## Layer 3: when to escalate to an LLM

Only for rules that are genuinely not mechanical:

- Comment adequacy — "don't assume users are expert programmers"
- Procedure naming — reporters are nouns, commands are verbs, reads naturally in context
- "Avoid globals!" — is this global actually justified?
- Turtle-centric style (`right 10`, not `set heading heading + 10`)
- Simultaneous-update correctness — `ask` is serial since NetLogo 4.0, so does this
  tick need a belief snapshot?
- Whether a `carefully` block surfaces the error or silently swallows it

**Never** ask an LLM to check something in Layer 0. It costs tokens and is less reliable.

## Traps that produce false positives (learned the hard way)

These are baked into the script. Preserve them.

- **`?` is part of the identifier.** `use-llm?` must not be matched with `?` as a
  boundary char. Getting this wrong reported `use-llm?`, `thinking-mode?`,
  `show-votes?`, `auto-reveal?` as dead when all are used — 8 false positives.
- **NetLogo identifiers contain `-`.** A bare `prompt` matches inside `current-prompt`.
  Guard both sides with `[^a-zA-Z0-9?_-]`.
- **Config paths resolve against the MODEL's directory, not the shell's CWD.** Never add
  a CWD fallback: running from the repo root made the broken `"demos/config"` look valid.
  That exact false negative is how issue #66 shipped to the Models Library.
- **Model-defined helpers are not traps.** `lower-case-string` is correct; only the bare
  `lower-case` primitive is missing in NetLogo 7.
- **Test harnesses legitimately `print`.** `tests.nlogox` / `reliability-tests.nlogox`
  are exempt. A blanket ban is noise, and noisy checks get disabled — see below.

## Why advisory, not blocking

This repo already ran the experiment. `scripts/scan-secrets.sh` existed with a
`pre-commit` hook — and `core.hooksPath` was set to `/dev/null`, so it never ran once.
Enabling it produced 1 real finding and 16 false positives (the filter doesn't match
`YOUR_OPENAI_API_KEY_HERE`). Someone hit the noise and disabled the whole mechanism
rather than fixing the regex, trading a noisy check for **no check**.

So: compile blocks because it has zero false positives. Everything else advises.

## Provider work needs a live call (Layer 4)

Verified 13 Aug 2026 against Groq. Two review findings, both derived carefully from
vendor documentation, and **one real call settled each in the opposite direction from
what the docs implied**:

| Claim from doc review | What the live call showed |
|---|---|
| Groq defaults to `reasoning_format: "raw"`, so `<think>` tags leak into visible content — rated HIGH | **False for `gpt-oss-20b`.** Returns clean `content` plus a separate `reasoning` field, with no `reasoning_format` sent at all. |
| `reasoning_effort` mismatch between extension and provider — rated MEDIUM | **True and worse.** `xhigh` is accepted by the extension and returns **HTTP 400** from Groq: `value is not one of ['none','default','low','medium','high']`. |

The lesson is not "docs are wrong" — it is that **request-shape and response-shape claims
are only settled by a request.** Test both directions:

```bash
# what does the provider actually return?
curl -s https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"...","messages":[{"role":"user","content":"hi"}]}' \
  | python3 -c "import json,sys; m=json.load(sys.stdin)['choices'][0]['message']; print(list(m.keys()))"

# does the provider accept what we send?  (probe each param the extension can emit)
# then the same path through the extension, which is what users actually hit:
~/.claude/skills/netlogo-review/nlrun.sh -d demos/e2e-tests \
  'llm:load-config "config-groq.txt"
   llm:set-reasoning-effort "xhigh"
   carefully [ emit llm:chat "hi" ] [ emit (word "ERROR: " error-message) ]'
```

**Model registries go stale on the provider's schedule, not yours.** Check the
provider's *deprecation* page, not its model list — a model can sit under "Production
Models" with no banner while being three days from shutdown. Both obvious Groq default
picks (`llama-3.1-8b-instant`, `llama-3.3-70b-versatile`) were in exactly that state on
13 Aug 2026, and three more candidates were already decommissioned.

**Keys never go in a tracked file.** Ship `config-<provider>.txt.example` with a
placeholder, gitignore the real one, and confirm with `git check-ignore -v` before
committing. A file that is both tracked *and* gitignore-negated still stages on
`git add -A` — `.gitignore` has no effect on already-tracked files.

## Regression test

```bash
~/.claude/skills/netlogo-review/selftest.sh
REPO=/path/to/a/branch ~/.claude/skills/netlogo-review/selftest.sh   # test another checkout
```

**The suite builds its fixtures from the live repo**, so a real bug in `demos/color-sharing`
shows up as a selftest failure. On 13 Aug 2026 `false positive on valid config path`
failed against `main` — correctly, because the model there really did carry the broken
`llm:load-config "demos/config"` from issue #66. The same run passed 20/20 against the
branch that fixed it. **Before "fixing" a selftest failure, check whether the checker is
right and the repo is wrong.**

Asserts the checker still catches the real bugs (broken config path, fake primitives) and
still stays quiet on the fixed versions. Run after editing `nlcheck.sh`.

## Related

- `netlogo-dev` — building, installing, `.nlogox` XML format
- `ccl-demo-builder` — demo build workflow; its `errors.md` feeds Layer 2
