---
name: making-explainer-videos
description: Use when the user wants a narrated explainer video, animated walkthrough, or 3Blue1Brown-style animation that teaches a concept, paper, method, or result on any subject - plans the explanation with the user, then turns an approved video.yaml into a Manim video with ElevenLabs (or macOS `say`) narration, equations without LaTeX, chapters for long videos, subtitles, and checks that every on-screen word traces to the approved spec.
---

# Making Explainer Videos

## Overview

Goal: the viewer **understands** a hard idea, not just sees it. The user owns the content; this skill owns teaching structure, visuals, timing, and verification. Nothing is rendered until the user approves the outline and spec.

**Never put a claim, number, title, or label on screen that is not in the approved spec.** Computed numbers go in `derived` with their formula. Extra labels go in `on_screen`. Equations go in `equations`.

Flow: sources → **teaching outline (user approves)** → `video.yaml` (user approves) → `ste_check.py` → `tts.py` → `scenes.py` → `build.py` → `verify.py` → contact sheet → deliver.

## 1. Teaching outline (before any spec)

Read the sources the user names. Check them: if a source contradicts itself or its own formula, tell the user before building on it. Then propose a short outline, one line per scene, following this arc:

1. **Hook** — a concrete question or puzzle the concept answers. Not a definition.
2. **One running example** — a small, concrete case reused through the whole video (e.g. 8 answers scored 0/1). Every abstract step is shown on it.
3. **Intuition before formalism** — show what happens with the example first; name it and write the formula after.
4. **One step per scene** — each scene adds exactly one new idea on top of the last.
5. **Show the wrong idea or the failure first** when the concept fixes a problem — the viewer sees the problem before hearing its name.
6. **Generalize** — the formula or rule, with each part labelled by its job.
7. **Recap + check question** — one question the viewer should now be able to answer.

Length follows the concept: as many scenes as the steps need. Over ~12 scenes, group them into chapters. Show the outline to the user and wait for approval or edits.

## 2. Spec (user approves)

```yaml
title: How GRPO computes advantages
slug: grpo-advantage
scenes:
  - id: easy_group                # lowercase; class becomes EasyGroupScene
    chapter: problem              # optional; build/verify one chapter at a time
    narration: >                  # spoken exactly as written
      Now seven answers are right and one is wrong.
    visual: >                     # what to show; never shown verbatim
      Eight dots on a 0-to-1 line, seven at 1. Mean marker at 0.875.
    data: {Correct: 7, Total: 8}  # numbers from sources; may show as 7, 7.0, 88%...
    derived:                      # numbers you computed: value -> formula (required)
      "0.875": "mean of seven 1s and one 0"
      "-2.65": "(0 - 0.875) / 0.331"
    equations: ['A_i = \frac{r_i - \mu}{\sigma}']   # matplotlib mathtext, exact strings
    on_screen: ["mean"]           # extra labels the user approved
pronounce: {GRPO: "G R P O"}      # optional, top level: changes the voice only, never subtitles or screen
```

Anything approved in a scene stays approved for every later scene, so a running example can keep earlier values on screen without re-declaring them.

When a number depends on a convention (population vs sample std, log base, rounding), state the convention in the `derived` formula and in the outline.

Narration, data, and `derived` come from the user or the sources they named. Show the full spec and the list of `derived` values to the user before rendering.

## 3. Commands

From `~/.claude/skills/making-explainer-videos` (work dir anywhere):

```bash
uv run python scripts/ste_check.py SPEC                  # report STE issues; the user decides fixes
uv run python scripts/tts.py SPEC WORK [--engine elevenlabs|say --voice brian|george|<id>]   # rerun when narration changes
uv run python scripts/build.py SPEC SCENES.py WORK --quality low [--only ID | --chapter NAME]
uv run python scripts/verify.py SPEC WORK                # exit 1 on any failure
uv run python scripts/build.py SPEC SCENES.py WORK --quality high --deliver DEST
uv run python scripts/verify.py SPEC WORK
```

Voice engines, chosen automatically in this order unless `--engine` is given:
- `elevenlabs` (paid, best): `eleven_multilingual_v2`, default voice `brian`; key from `ELEVENLABS_API_KEY` or Keychain service `elevenlabs-api`.
- `kokoro` (free, offline, Apache-2.0): default voice `am_michael` (also `bm_george`, `af_heart`). Needs `~/.cache/kokoro/kokoro-v1.0.onnx` and `voices-v1.0.bin` from https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0.
- `say` (free, robotic): macOS built-in. ElevenLabs clips are cached in `~/.cache/explainer-tts`, so re-running unchanged sentences costs nothing; the run prints the characters billed. Never write the key into a file.

Iterate at `low`; render `high` once. Long videos: build and verify each `--chapter`, then the full video.

## Workflows and the judge (for series or long videos)

Two named workflows in `~/.claude/workflows/` wrap this skill; use them when the user asks for several videos or a long one (invoke by `scriptPath` if they were edited in the current session):

- `explainer-plan` — `{mode: "outline"|"spec", videos: [{id, dir, title, goal, sources, outline?}]}`. Drafts each outline or spec in parallel, then an independent judge applies `references/judge.md` (goal fidelity and drift, teaching arc, accuracy, density, honest limits), and the draft is revised until PASS (max 2 rounds). The output still goes to the user for approval.
- `explainer-render` — `{spec, dir, engine?, voice?, deliver?}`, only after the user approved the spec. Narrates once, builds each chapter in parallel (one `scenes_<chapter>.py` per chapter, each checked in its own work folder), assembles a `scenes.py` that imports them, renders 1080p, then the judge reviews the finished video (adds visual fit). One repair round for code-fixable problems; anything that needs narration changes is returned to the user, never edited silently.

Keep one folder per video (`outline.md`, `video.yaml`, `scenes_*.py`, `scenes.py`, `work/`).

## 4. Writing scenes.py

Copy `examples/scenes.py`. One class per scene, `<Id>Scene(NarratedScene)`, `scene_id` set, animation in `narrate()`:

- `self.at(i)` — wait for sentence `i`; show each idea while its sentence plays.
- `self.fit(seconds)` — cap animations to the narration.
- `self.label(text, size=..., color=...)` — the only way to make text (logged and checked).
- `import kit` for reusable blocks (all topic-free):
  - `kit.equation(self, tex)` — math without LaTeX; tex must be in the scene's `equations`.
  - `kit.equation_row(self, parts)` — the same equation built from separate parts, so one part can be pointed at, colored, or transformed. Each part must be in `equations`.
  - `kit.flow(self, steps)` — boxes + arrows for pipelines and processes.
  - `kit.number_line_points(self, values, x_range)` + `kit.marker(...)` — distributions, means, thresholds.
  - `kit.span(self, mob, text)` — brace label; only for exactly what it spans.
  - `kit.table(self, rows)` — step-by-step state; `Transform` cells as state changes.
  - `kit.timeline(self, events)`, `kit.plot(self, func, ...)` — sequences and curves.
- Reveal the running example piece by piece; keep it on screen and transform it rather than replacing it, so the viewer tracks one object.

## 5. Visual rules (3Blue1Brown style)

- One idea per scene; ~8 words of text on screen at most. Narration explains, screen shows.
- Every sentence changes something on screen (a reveal, move, highlight, or transform). A hold is allowed only when the sentence asks the viewer to look or think.
- Numbers as shapes (bars, positions, lengths) that move when the number is spoken.
- Color carries meaning consistently across the whole video (e.g. right = `good`, wrong = `bad`).
- Text and the shapes behind text stay ≥ 0.6 opacity; dim plain shapes only.
- Labels stay clear of lines and boxes and inside the safe margin.
- Shapes must not imply data the spec lacks (four boxes = a count of four).

## 6. Verify before saying "done"

1. `verify.py` passes: sync, every on-screen word traceable to the spec, equations listed, no overlaps or edge crowding, subtitles present.
2. Open every `WORK/contact_sheet_NN.png` page (9 tiles each) with Read and check every tile: the right thing is on screen for that sentence, nothing collides, nothing is blank or cut off, the running example is still readable.
3. Fix, rebuild the affected scene (`--only`), rebuild, verify again.

## 7. Deliver

Obsidian: `--deliver "$VAULT/70_ASSETS"`, embed with `![[SLUG.mp4]]`. Report path, duration, and every `derived` value and source correction.

## Common mistakes

| Mistake | Fix |
|---|---|
| Rendering before the user approved the outline and spec | Stop at the outline; render only after approval. |
| Starting with the definition or formula | Start with the hook and the running example. |
| A new example in every scene | One running example, transformed scene to scene. |
| Computed numbers on screen without declaring them | Put each in `derived` with its formula and show the list to the user. |
| Building on a source claim that is wrong | Check sources; report contradictions before writing the spec. |
| Adding titles, ratios, or "insight" labels not in the spec | Propose them; add to `on_screen` only if approved. |
| Labels that misstate what a shape spans | A brace or label describes exactly what it covers. |
| Animations bunched at scene start or overrunning narration | `self.at(i)` per sentence; `self.fit(...)` on run times. |
| Checking a few random frames | Use the contact sheet; it samples after every sentence. |
| Rewriting the user's narration to pass the STE check | Report findings; the user decides. |
| Acronyms or names the voice mispronounces | Add them to `pronounce`; listen to one clip from `WORK/audio/`. |
