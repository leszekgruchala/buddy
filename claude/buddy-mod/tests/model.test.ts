import { expect, test } from 'claude-code/testing'

import { applyTaskCreate, applyTaskUpdate, buddyAgent, buddySkill, newFlow, parseSpec, phaseViews, runningPhaseId } from '../hooks/model'
import { focusOf } from '../hooks/view'
import { SPEC } from './fixtures'

test('reads phases, lists, revision and AGENT LOG results from a spec', () => {
  const spec = parseSpec('.ai/worklog/20261008_parser/spec_parser.md', SPEC)

  expect(spec?.title).toBe('Parser upgrade')
  expect(spec?.revision).toBe(2)
  expect(spec?.phases.map(phase => [phase.id, phase.status])).toEqual([
    ['P1', 'success'],
    ['P2', 'pending'],
  ])
  expect(spec?.phases[1]?.requirements).toEqual(['R1', 'R2'])
  expect(spec?.phases[0]?.criteria).toEqual(['SC1'])
})

test('accepts only Buddy skills and agents', () => {
  expect(buddySkill('buddy:develop')).toBe('develop')
  expect(buddySkill('/buddy:review-code')).toBe('review-code')
  expect(buddySkill('spec')).toBeUndefined()
  expect(buddySkill('other:spec')).toBeUndefined()
  expect(buddyAgent('buddy:implementor')).toBe('implementor')
  expect(buddyAgent('general-purpose')).toBeUndefined()
})

test('a running phase takes its progress from its implementor task list', () => {
  const spec = parseSpec('spec_parser.md', SPEC.replace('- P1 SUCCESS', '- nothing'))!
  const flow = {
    ...newFlow('develop', 0),
    stage: 'implement' as const,
    spec,
    tasks: [
      { id: '1', subject: 'P1: Replace the tokenizer with a streaming tokenizer', status: 'in_progress' as const },
      { id: '2', subject: 'P2: Validate the final implementation', status: 'pending' as const },
    ],
    agents: [
      {
        toolUseId: 't1',
        agentId: 'a1',
        type: 'implementor',
        description: 'Implement P1',
        phaseId: 'P1',
        tokens: 0,
        status: 'running' as const,
        activity: 'Editing src/tok.ts',
        startedAt: 0,
        tasks: [
          { id: 'a', subject: 'Write tokenizer', status: 'completed' as const },
          { id: 'b', subject: 'Add tests', status: 'in_progress' as const },
          { id: 'c', subject: 'Wire parser', status: 'pending' as const },
        ],
      },
    ],
  }
  const views = phaseViews(flow)
  const focus = focusOf(flow)

  expect(views.map(view => view.status)).toEqual(['running', 'pending'])
  expect(focus.phase?.id).toBe('P1')
  expect(focus.bar?.done).toBe(1)
  expect(focus.bar?.total).toBe(3)
  expect(focus.activity).toBe('Editing src/tok.ts')
  expect(focus.overall?.total).toBe(2)
})

test('main-loop tasks count only for the phase that ran when the main loop made them', () => {
  const spec = parseSpec('spec_parser.md', SPEC.replace('- P1 SUCCESS', '- nothing'))!
  let flow = {
    ...newFlow('implement', 0),
    spec,
    tasks: applyTaskCreate(
      applyTaskCreate([], '1', 'P1: Replace the tokenizer with a streaming tokenizer'),
      '2',
      'P2: Validate the final implementation',
    ),
  }

  // P1 runs in the main loop with two work items of its own.
  flow = { ...flow, tasks: applyTaskUpdate(flow.tasks, '1', { status: 'in_progress' }) }
  flow = { ...flow, tasks: applyTaskCreate(flow.tasks, '3', 'Write tokenizer', runningPhaseId(flow)) }
  flow = { ...flow, tasks: applyTaskCreate(flow.tasks, '4', 'Add tests', runningPhaseId(flow)) }
  flow = { ...flow, tasks: applyTaskUpdate(flow.tasks, '3', { status: 'completed' }) }

  expect(focusOf(flow).bar).toMatchObject({ done: 1, total: 2 })

  // P1 is done and P2 starts: P1's finished items must not show as P2's progress.
  flow = { ...flow, tasks: applyTaskUpdate(flow.tasks, '4', { status: 'completed' }) }
  flow = { ...flow, tasks: applyTaskUpdate(flow.tasks, '1', { status: 'completed' }) }
  flow = { ...flow, tasks: applyTaskUpdate(flow.tasks, '2', { status: 'in_progress' }) }

  expect(focusOf(flow).phase?.id).toBe('P2')
  expect(focusOf(flow).bar).toBeUndefined()

  flow = { ...flow, tasks: applyTaskCreate(flow.tasks, '5', 'Run the spec checks', runningPhaseId(flow)) }

  expect(focusOf(flow).bar).toMatchObject({ done: 0, total: 1 })
})

test('a phase stays in work from its start until its result is recorded, with no task lists', () => {
  const block = (id: string, extra = '') => `\`\`\`yaml\nid: ${id}\ngoal: Goal ${id}\n${extra}requirements: [R1]\nsuccess_criteria: [SC1]\n\`\`\``
  const text = (log: string[]) =>
    `# Demo\n\n## PHASES\n\n${block('P1')}\n\n${block('P2', 'agent: Main\n')}\n\n${block('P3')}\n\n## AGENT LOG\n${log.map(id => `- ${id} SUCCESS (revision 1) — ok`).join('\n')}\n`
  const worker = (id: string, status: 'running' | 'done') => ({
    toolUseId: `use-${id}`,
    agentId: `agent-${id}`,
    type: 'implementor',
    description: `Implement ${id}`,
    phaseId: id,
    tokens: 0,
    status,
    startedAt: 0,
    tasks: [],
  })
  const statuses = (flow: Parameters<typeof phaseViews>[0]) => phaseViews(flow).map(view => view.status)
  const base = { ...newFlow('implement', 0), spec: parseSpec('spec_demo.md', text([]))! }

  expect(base.spec.phases.map(phase => phase.runner)).toEqual([undefined, 'Main', undefined])

  // The worker ends; the host verifies P1 before it records the result.
  expect(statuses({ ...base, agents: [worker('P1', 'running')] })).toEqual(['running', 'pending', 'pending'])
  expect(statuses({ ...base, agents: [worker('P1', 'done')] })).toEqual(['running', 'pending', 'pending'])
  // While the main loop waits for the person, nothing runs.
  expect(statuses({ ...base, isWorking: false, agents: [worker('P1', 'done')] })).toEqual(['pending', 'pending', 'pending'])

  // P1 is recorded: the main loop works on the Main phase P2.
  const logged = { ...base, spec: parseSpec('spec_demo.md', text(['P1']))!, agents: [worker('P1', 'done')] }
  expect(statuses(logged)).toEqual(['success', 'running', 'pending'])
  expect(statuses({ ...logged, isWorking: false })).toEqual(['success', 'pending', 'pending'])

  // A later phase that starts ends the wait of an unrecorded earlier one.
  expect(statuses({ ...logged, agents: [worker('P1', 'done'), worker('P3', 'running')] })).toEqual([
    'success',
    'pending',
    'running',
  ])
  expect(statuses({ ...base, agents: [worker('P1', 'done'), worker('P3', 'running')] })).toEqual([
    'pending',
    'pending',
    'running',
  ])
})
