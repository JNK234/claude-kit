export const meta = {
  name: 'explainer-render',
  description: 'Render an approved explainer-video spec: narrate once, build and check chapters in parallel, assemble at 1080p, then a hard judge reviews the finished video',
  whenToUse: 'With the making-explainer-videos skill, only after the user has approved the video.yaml. Args: {spec, dir, engine?, voice?, deliver?}.',
  phases: [
    { title: 'Narrate', detail: 'one TTS run for the whole spec; lists chapters' },
    { title: 'Chapters', detail: 'one agent per chapter writes its scenes file, builds, verifies, inspects contact sheets' },
    { title: 'Assemble', detail: 'join chapters, render high quality, full verify' },
    { title: 'Judge', detail: 'independent hostile review of the finished video, one repair round if it fails' },
  ],
}

// args: { spec: "<dir>/video.yaml", dir: "<video folder>", engine?: "kokoro"|"elevenlabs"|"say", voice?: string,
//         deliver?: "<folder for the final MP4 and SRT>" }
const SKILL = "__KIT__/plugins/explainer-videos/skills/making-explainer-videos"
const a = args || {}
if (!a.spec || !a.dir) return { error: "Pass args {spec, dir, engine?, voice?, deliver?}" }
const WORK = a.dir + "/work"
const RUN = "cd " + SKILL + " && uv run python scripts/"
const voiceFlags = (a.engine ? " --engine " + a.engine : "") + (a.voice ? " --voice " + a.voice : "")

const NARRATE_SCHEMA = {
  type: "object", required: ["chapters"],
  properties: {
    chapters: { type: "array", items: { type: "object", required: ["name", "scene_ids"],
      properties: { name: { type: "string" }, scene_ids: { type: "array", items: { type: "string" } } } } },
    total_seconds: { type: "number" }, notes: { type: "string" },
  },
}
const BUILD_SCHEMA = {
  type: "object", required: ["ok", "summary"],
  properties: { ok: { type: "boolean" }, summary: { type: "string" }, file: { type: "string" },
    duration: { type: "number" }, open_issues: { type: "array", items: { type: "string" } } },
}
const JUDGE_SCHEMA = {
  type: "object", required: ["verdict", "scores", "must_fix"],
  properties: {
    verdict: { enum: ["PASS", "FAIL"] }, scores: { type: "object" },
    must_fix: { type: "array", items: { type: "string" } },
    should_fix: { type: "array", items: { type: "string" } },
    drift: { type: "array", items: { type: "string" } },
    narration_changes_needed: { type: "array", items: { type: "string" } },
  },
}

phase("Narrate")
const narr = await agent(
  "Generate the narration audio for an approved explainer video. Use Bash.\n" +
  "Run: `" + RUN + "tts.py " + a.spec + " " + WORK + voiceFlags + "`\n" +
  "Then read " + a.spec + " and list its chapters in scene order: each chapter name with its scene ids. " +
  "Scenes with no `chapter` field belong to a chapter named `main`. Report the total narration seconds (sum of `total` in " + WORK + "/timings.json).",
  { label: "narrate", phase: "Narrate", schema: NARRATE_SCHEMA })
if (!narr || !narr.chapters.length) return { error: "narration step failed", narr }
log("Narration done: " + narr.chapters.length + " chapters, " + Math.round(narr.total_seconds || 0) + " s")

const CHAPTER = (ch) =>
  "Write and build ONE chapter of an approved explainer video. Follow " + SKILL + "/SKILL.md sections 4-6 exactly, and use " + SKILL + "/examples/scenes.py and " + SKILL + "/scripts/kit.py as references.\n" +
  "Spec: " + a.spec + " (do NOT edit it). Chapter: `" + ch.name + "` with scenes " + ch.scene_ids.join(", ") + ".\n" +
  "1. Write " + a.dir + "/scenes_" + ch.name + ".py containing ONLY the scene classes for these scene ids (`<Id>Scene(NarratedScene)`). Start the file with two `# ABOUTME:` comment lines. Import from `narrated` and `kit`.\n" +
  "2. Work in your own folder: `mkdir -p " + WORK + "/ch_" + ch.name + " && cp " + WORK + "/timings.json " + WORK + "/ch_" + ch.name + "/`.\n" +
  "3. Build: `" + RUN + "build.py " + a.spec + " " + a.dir + "/scenes_" + ch.name + ".py " + WORK + "/ch_" + ch.name + " --chapter " + ch.name + " --quality low`\n" +
  "4. Verify: `" + RUN + "verify.py " + a.spec + " " + WORK + "/ch_" + ch.name + "` and open EVERY contact_sheet_NN.png page with the Read tool. Check each tile against its sentence.\n" +
  "5. Fix and repeat until verify passes and every tile is right. If something cannot be fixed without changing the spec, stop and list it in open_issues.\n" +
  "Return ok, a short summary, and open issues."

phase("Chapters")
const chapters = await parallel(narr.chapters.map(ch => () =>
  agent(CHAPTER(ch), { label: "chapter:" + ch.name, phase: "Chapters", schema: BUILD_SCHEMA })))
const chapterIssues = chapters.map((c, i) => ({ name: narr.chapters[i].name, c }))
  .filter(x => !x.c || !x.c.ok)
if (chapterIssues.length) log("Chapters with problems: " + chapterIssues.map(x => x.name).join(", "))

const ASSEMBLE = (extra) =>
  "Assemble and render an explainer video. Use Bash and Read.\n" +
  "1. Write " + a.dir + "/scenes.py (two `# ABOUTME:` lines first) that imports every chapter module: " +
  narr.chapters.map(ch => "`from scenes_" + ch.name + " import *`").join(", ") + ".\n" +
  "2. Build: `" + RUN + "build.py " + a.spec + " " + a.dir + "/scenes.py " + WORK + " --quality high" + (a.deliver ? " --deliver \"" + a.deliver + "\"" : "") + "`\n" +
  "3. Verify: `" + RUN + "verify.py " + a.spec + " " + WORK + "` and open EVERY contact_sheet_NN.png page with Read.\n" +
  (extra || "") +
  "4. If verify fails or a tile is wrong, fix the chapter file that owns that scene, rebuild that scene with `--only <id> --quality low` to check, then rebuild high and verify again.\n" +
  "Return ok, a summary, the final MP4 path, its duration, and open issues."

phase("Assemble")
let built = await agent(ASSEMBLE(""), { label: "assemble", phase: "Assemble", schema: BUILD_SCHEMA })

const JUDGE = (round) =>
  "Judge a finished explainer video. Read the rubric at " + SKILL + "/references/judge.md and apply it strictly, including visual_fit.\n" +
  "Spec (narration, visuals, sources implied by data/derived): " + a.spec + "\n" +
  "Learning goal: read the `title` and the outline at " + a.dir + "/outline.md (its 'Learning goal' line).\n" +
  "Sources: listed in the outline; read the ones you need with `obsidian-cli print \"<path>\" 2>/dev/null`.\n" +
  "Video evidence: the subtitle file and every contact_sheet_NN.png page in " + WORK + " (open each with Read). Scene code: " + a.dir + "/scenes_*.py.\n" +
  (round > 0 ? "This is a re-judge after a repair round; confirm each earlier must-fix is resolved.\n" : "") +
  "Separate problems the scene code can fix (must_fix) from problems that need the narration or spec changed (narration_changes_needed); the spec is user-approved and must not be edited without the user."

phase("Judge")
// args.judge === false skips the final review (the spec was already judged); verify.py and contact sheets still ran.
let verdict = a.judge === false ? null
  : await agent(JUDGE(0), { label: "judge", phase: "Judge", schema: JUDGE_SCHEMA, effort: "high" })
let repaired = false
if (verdict && verdict.verdict === "FAIL" && verdict.must_fix.length) {
  log("Judge FAIL with " + verdict.must_fix.length + " visual/code must-fixes; one repair round")
  built = await agent(ASSEMBLE("Before step 4, fix these judge findings in the chapter scene files (do not edit the spec):\n- " +
    verdict.must_fix.join("\n- ") + "\n"), { label: "repair", phase: "Judge", schema: BUILD_SCHEMA })
  verdict = await agent(JUDGE(1), { label: "re-judge", phase: "Judge", schema: JUDGE_SCHEMA, effort: "high" })
  repaired = true
}

return {
  final: built && built.file, duration: built && built.duration, assembled_ok: built && built.ok,
  chapter_problems: chapterIssues.map(x => ({ name: x.name, issues: x.c ? x.c.open_issues : ["agent failed"] })),
  judge: verdict, repaired,
  needs_user: verdict ? (verdict.narration_changes_needed || []) : [],
}
