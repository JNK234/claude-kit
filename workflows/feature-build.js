// ABOUTME: Loop shape — feature build via coder + implementation-blind adversarial tester,
// ABOUTME: repair loop until the tester signs off or budget exhausts. Genome file. Invoke with
// args: {task, requirements, gate: "<test command>", cwd}

export const meta = {
  name: 'feature-build',
  description: 'Build a feature: coder implements, blind tester attacks, repair until sign-off',
  phases: [
    { title: 'Build', detail: 'coder implements against requirements' },
    { title: 'Attack', detail: 'blind tester tries to break it' },
    { title: 'Repair', detail: 'coder fixes cited failures, tester re-checks' },
  ],
}

const { task, requirements, gate, cwd } = args
const MAX_ROUNDS = 3

phase('Build')
let build = await agent(
  `In ${cwd}: implement this feature. Task: ${task}. Requirements:\n${requirements}\n` +
  `Conventions: smallest reasonable change, match surrounding style, 2-line ABOUTME header on new ` +
  `files, no new dependencies without noting it. Run \`${gate}\` before returning. ` +
  `Return: what changed, gate status, anything deliberately not touched.`,
  { label: 'coder', schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        gate_passed: { type: 'boolean' },
        changed_files: { type: 'array', items: { type: 'string' } },
      },
      required: ['summary', 'gate_passed'],
    } }
)

let round = 0
let verdict = null
while (round < MAX_ROUNDS) {
  round++
  phase('Attack')
  // Tester is deliberately blind: requirements only, never the coder's summary or diff.
  verdict = await agent(
    `In ${cwd}: you are an adversarial tester. You have ONLY these requirements:\n${requirements}\n` +
    `Try to BREAK the implementation: run the code, run \`${gate}\`, probe edge cases, empty inputs, ` +
    `and unhappy paths the requirements imply. Reading the diff is not verification — execute things. ` +
    `"Could not verify" counts as FAIL. Return PASS only if you genuinely tried and failed to break it.`,
    { label: `tester-round-${round}`, phase: 'Attack', schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
          findings: { type: 'array', items: { type: 'string' } },
        },
        required: ['verdict', 'findings'],
      } }
  )
  if (!verdict || verdict.verdict === 'PASS') break

  phase('Repair')
  log(`tester found ${verdict.findings.length} issue(s) in round ${round} — repairing`)
  build = await agent(
    `In ${cwd}: an independent tester found these failures in the feature "${task}":\n` +
    verdict.findings.map((f, i) => `${i + 1}. ${f}`).join('\n') +
    `\nFix each cited failure with the smallest reasonable change. Run \`${gate}\` before returning.`,
    { label: `repair-round-${round}`, phase: 'Repair', schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          gate_passed: { type: 'boolean' },
          changed_files: { type: 'array', items: { type: 'string' } },
        },
        required: ['summary', 'gate_passed'],
      } }
  )
}

return {
  outcome: verdict && verdict.verdict === 'PASS' ? 'tester_signed_off' : 'failed_tester',
  rounds: round,
  last_findings: verdict ? verdict.findings : [],
  build_summary: build ? build.summary : null,
}
