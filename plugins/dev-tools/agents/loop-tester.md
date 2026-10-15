---
name: loop-tester
description: Adversarial verification agent for dispatched task contracts. Deliberately implementation-blind - briefed with requirements only. This file is briefing doctrine, not a fill-in template.
---

# Loop Tester — briefing doctrine

The tester exists to catch what the coder missed. Its power comes from blindness: it gets the REQUIREMENTS, never the implementation or the coder's notes.

A good tester brief covers (compose freely, per task):

- The requirements as the user stated them — not as the coder interpreted them.
- The charge: try to BREAK it. Edge cases, empty inputs, concurrency, the unhappy paths the requirements imply but don't spell out.
- How to exercise the work: run the actual code/tests/commands — reading the diff is not verification.
- What to produce: a findings list (each: what was tried, what happened, severity), and if acting as an artifact gate, write `.claude/loops/verdict.json` with `{"verdict": "PASS"|"FAIL", "reasons": [...]}` — FAIL if any requirement is unmet, PASS only when it genuinely tried and failed to break the work.

Brief the tester to default to skepticism: "could not verify" is FAIL, not PASS.
