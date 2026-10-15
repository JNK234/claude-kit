export const meta = {
  name: 'explainer-plan',
  description: 'Draft explainer-video outlines or specs in parallel, each critiqued by an independent hard judge and revised until it passes',
  whenToUse: 'With the making-explainer-videos skill: mode "outline" drafts teaching outlines from vault sources; mode "spec" turns an approved outline into video.yaml. Output still needs the user\'s approval before rendering.',
  phases: [
    { title: 'Draft', detail: 'one agent per video writes the outline or spec' },
    { title: 'Judge', detail: 'independent hostile judge scores goal fidelity, teaching arc, accuracy, density, limits' },
    { title: 'Revise', detail: 'apply must-fixes, then re-judge (max 2 rounds)' },
  ],
}

// args: { mode: "outline" | "spec", videos: [{ id, dir, title, goal, sources: [vault paths], outline? }] }
// Each video's files live in its own `dir`, so parallel agents never touch the same file.
const SKILL = "__KIT__/plugins/explainer-videos/skills/making-explainer-videos"
const MAX_ROUNDS = 4
const mode = args && args.mode
const videos = (args && args.videos) || []
if (!["outline", "spec"].includes(mode) || videos.length === 0) {
  return { error: 'Pass args {mode: "outline"|"spec", videos: [{id, dir, title, goal, sources}]}' }
}

const DRAFT_SCHEMA = {
  type: "object", required: ["file", "summary"],
  properties: {
    file: { type: "string" },
    summary: { type: "string" },
    source_problems: { type: "array", items: { type: "string" } },
    derived: { type: "array", items: { type: "string" } },
  },
}
const JUDGE_SCHEMA = {
  type: "object", required: ["verdict", "scores", "must_fix"],
  properties: {
    verdict: { enum: ["PASS", "FAIL"] },
    scores: {
      type: "object",
      properties: {
        goal_fidelity: { type: "number" }, teaching_arc: { type: "number" }, accuracy: { type: "number" },
        density: { type: "number" }, honest_limits: { type: "number" }, visual_fit: { type: ["number", "null"] },
      },
    },
    must_fix: { type: "array", items: { type: "string" } },
    should_fix: { type: "array", items: { type: "string" } },
    drift: { type: "array", items: { type: "string" } },
  },
}

const sourcesText = (v) => v.sources.map(s => "- " + s).join("\n")
const artifact = (v) => v.dir + (mode === "outline" ? "/outline.md" : "/video.yaml")

const DRAFT = (v) => mode === "outline"
  ? "Draft a teaching outline for one explainer video.\n\n" +
    "Read " + SKILL + "/SKILL.md section 1 and follow it exactly.\n" +
    "Video: " + v.title + "\nLearning goal (the only thing the video is for): " + v.goal + "\n" +
    "Sources (Obsidian vault paths; read with `obsidian-cli print \"<path>\" 2>/dev/null`; read Terms and setup, the body, Limitations, Expert read and Key claims):\n" + sourcesText(v) + "\n\n" +
    "Requirements: technically dense (real mechanisms, variables, numbers) but every term introduced before use; one running example through the whole video; check every source claim you use against the source's own Key claims and Limitations, and list contradictions or overclaims as source problems. Present position papers and single examples honestly.\n" +
    "Write the outline as markdown to " + artifact(v) + " (mkdir -p first) with: the learning goal; the running example; numbered scenes grouped into chapters, each `id (chapter): one line`; a `Source problems` list; a `Numbers used` list with the source of each.\n" +
    "Return the file path, a 2-sentence summary, and the source problems."
  : "Turn an approved teaching outline into a video spec.\n\n" +
    "Read " + SKILL + "/SKILL.md sections 2 and 5 and follow them exactly.\n" +
    "Video: " + v.title + "\nLearning goal: " + v.goal + "\nApproved outline: " + (v.outline || v.dir + "/outline.md") + "\n" +
    "Sources (read with `obsidian-cli print \"<path>\" 2>/dev/null`):\n" + sourcesText(v) + "\n\n" +
    "Write " + artifact(v) + ": scene ids and chapters from the outline; narration that is technically dense, plain (ASD-STE100 style: one idea per sentence, at most 25 words, active voice, no semicolons), and faithful to the sources; a `visual` per scene that shows the running example changing with each sentence; `data` for numbers quoted from sources, `derived` (value -> formula) for any number you computed, `equations` in matplotlib mathtext, `on_screen` for any extra label, and a top-level `pronounce` map for acronyms the voice may misread.\n" +
    "Then run `cd " + SKILL + " && uv run python scripts/ste_check.py " + artifact(v) + "` and fix real findings in your own wording. Also run `cd " + SKILL + " && uv run python -c \"import sys; sys.path.insert(0,'scripts'); import spec; spec.load('" + artifact(v) + "')\"` to validate.\n" +
    "Return the file path, a 2-sentence summary, source problems, and every derived value with its formula."

const JUDGE = (v, round) =>
  "Judge an explainer-video " + mode + ". Read the rubric at " + SKILL + "/references/judge.md and apply it strictly.\n" +
  "Learning goal: " + v.goal + "\nArtifact: " + artifact(v) + "\nSources (read with `obsidian-cli print \"<path>\" 2>/dev/null`):\n" + sourcesText(v) + "\n" +
  (round > 0 ? "This is revision round " + round + "; check that earlier must-fixes were actually fixed and that the revision did not add drift.\n" : "") +
  "visual_fit must be null (no video yet). Return the structured verdict."

const REVISE = (v, verdict) =>
  "Revise an explainer-video " + mode + " to address a judge's critique.\n" +
  "File: " + artifact(v) + "\nLearning goal: " + v.goal + "\nSkill rules: " + SKILL + "/SKILL.md\n" +
  "Sources (read with `obsidian-cli print \"<path>\" 2>/dev/null`):\n" + sourcesText(v) + "\n" +
  "Must fix (all of them):\n- " + verdict.must_fix.join("\n- ") + "\n" +
  "Should fix (where it serves the goal):\n- " + (verdict.should_fix || []).join("\n- ") + "\n" +
  "Drift to remove:\n- " + (verdict.drift || []).join("\n- ") + "\n" +
  "Edit the file in place. Do not add new topics. " + (mode === "spec" ? "Re-run ste_check.py and the spec validation after editing. " : "") +
  "Return the file path, a 2-sentence summary of the changes, source problems, and (spec mode) derived values."

const results = await pipeline(
  videos,
  (v) => agent(DRAFT(v), { label: "draft:" + v.id, phase: "Draft", schema: DRAFT_SCHEMA }),
  async (draft, v) => {
    if (!draft) return { id: v.id, error: "draft failed" }
    let verdict = await agent(JUDGE(v, 0), { label: "judge:" + v.id, phase: "Judge", schema: JUDGE_SCHEMA, effort: "high" })
    let latest = draft
    let round = 0
    while (verdict && verdict.verdict === "FAIL" && round < MAX_ROUNDS) {
      round += 1
      log(v.id + ": judge FAIL (" + verdict.must_fix.length + " must-fix), revision " + round)
      latest = (await agent(REVISE(v, verdict), { label: "revise:" + v.id + ":" + round, phase: "Revise", schema: DRAFT_SCHEMA })) || latest
      verdict = await agent(JUDGE(v, round), { label: "judge:" + v.id + ":" + round, phase: "Judge", schema: JUDGE_SCHEMA, effort: "high" })
    }
    if (verdict && verdict.verdict === "FAIL") log(v.id + ": still FAIL after " + MAX_ROUNDS + " revisions; returning with open must-fixes")
    return {
      id: v.id, file: latest.file || artifact(v), summary: latest.summary,
      source_problems: (latest.source_problems || []).concat(draft.source_problems || []),
      derived: latest.derived || draft.derived || [], rounds: round, judge: verdict,
    }
  },
)

return { mode, videos: results.filter(Boolean) }
