// ABOUTME: Loop shape — bug fix via reproduce -> fix -> verify, single focused agent per stage.
// ABOUTME: Genome file: evolvable by reflection, judged by dispatch outcomes. Invoke with
// args: {task, repro: "<command that currently fails>", cwd}

export const meta = {
  name: 'bug-fix',
  description: 'Reproduce a bug, fix it, verify the repro command passes',
  phases: [
    { title: 'Reproduce', detail: 'confirm the failure and localize it' },
    { title: 'Fix', detail: 'smallest change that makes the repro pass' },
    { title: 'Verify', detail: 'repro green + no collateral damage' },
  ],
}

const { task, repro, cwd } = args

phase('Reproduce')
const diagnosis = await agent(
  `In ${cwd}: run \`${repro}\` and confirm it fails. Localize the failure: which file/function, ` +
  `what root cause. Task context: ${task}. Return: failing output summary, suspected root cause, ` +
  `files to change. Do NOT fix anything yet.`,
  { label: 'diagnose', schema: {
      type: 'object',
      properties: {
        reproduces: { type: 'boolean' },
        root_cause: { type: 'string' },
        files: { type: 'array', items: { type: 'string' } },
      },
      required: ['reproduces', 'root_cause', 'files'],
    } }
)

if (!diagnosis || !diagnosis.reproduces) {
  return { outcome: 'no_repro', note: 'repro command did not fail as described', diagnosis }
}

phase('Fix')
let attempt = 0
let lastResult = null
while (attempt < 3) {
  attempt++
  lastResult = await agent(
    `In ${cwd}: fix this bug with the smallest reasonable change. Task: ${task}. ` +
    `Root cause per diagnosis: ${diagnosis.root_cause}. Files: ${diagnosis.files.join(', ')}. ` +
    `${lastResult ? `Previous attempt failed the gate with: ${lastResult.gate_output}. ` : ''}` +
    `After changing, run \`${repro}\` yourself. Match surrounding code style; no drive-by refactors. ` +
    `Return whether the repro now passes and the tail of its output.`,
    { label: `fix-attempt-${attempt}`, phase: 'Fix', schema: {
        type: 'object',
        properties: {
          gate_passed: { type: 'boolean' },
          gate_output: { type: 'string' },
          changed_files: { type: 'array', items: { type: 'string' } },
        },
        required: ['gate_passed', 'gate_output'],
      } }
  )
  if (lastResult && lastResult.gate_passed) break
  log(`fix attempt ${attempt} failed gate — looping`)
}

phase('Verify')
const verify = await agent(
  `In ${cwd}: independently verify the bug fix. Run \`${repro}\` and the nearest broader test ` +
  `scope around the changed files (${(lastResult.changed_files || []).join(', ')}). You did not ` +
  `write this fix — be skeptical. Return pass/fail and any collateral damage found.`,
  { label: 'verify', schema: {
      type: 'object',
      properties: { pass: { type: 'boolean' }, notes: { type: 'string' } },
      required: ['pass', 'notes'],
    } }
)

return {
  outcome: verify && verify.pass ? 'verified' : 'failed',
  fix_attempts: attempt,
  changed_files: lastResult.changed_files || [],
  verifier_notes: verify ? verify.notes : 'verifier died',
}
