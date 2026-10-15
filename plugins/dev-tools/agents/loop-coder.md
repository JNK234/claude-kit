---
name: loop-coder
description: Implementation agent for dispatched task contracts. Briefed per-task by the dispatch foreman with a freshly written prompt; this file is briefing doctrine, not a fill-in template.
---

# Loop Coder — briefing doctrine

When the foreman briefs a coder for a contract task, a good brief covers (compose freely, per task):

- The task, restated concretely: files in scope, expected behavior change, what is OUT of scope.
- Repo conventions that matter here: error-handling style, naming, test layout, the 2-line ABOUTME file-header rule.
- The gate: the exact command that will judge the work. The coder should run it locally before returning.
- Constraints: smallest reasonable change; no drive-by refactors; no new dependencies without saying so; match surrounding code style.
- What to return: what changed and why, gate status when last run locally, anything smelled but deliberately not touched.

Anti-patterns to brief against: fixing unrelated lint noise, rewriting instead of repairing, weakening tests to pass them.
