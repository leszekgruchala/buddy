import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { On, RenderElement } from 'claude-code'

import { reopenFlow } from '../hooks/model'
import { viewOf } from '../hooks/view'
import type { BuddyFlow } from '../types'
import { SETTLE_MS, SPEC } from './fixtures'

const SPEC_PATH = '.ai/worklog/20261008_parser/spec_parser.md'
const flowRef = { plugin: 'buddy', key: 'flow' } as const
const hiddenRef = { plugin: 'buddy', key: 'isHidden' } as const

const usage = (input: number, output: number, model = 'claude-sonnet-5-5') => ({
  input_tokens: input,
  output_tokens: output,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
  model,
})

const turn = (extra: Record<string, unknown>) =>
  ({ answer: '', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer', ...extra }) as never

/** The tracker with a mocked clock, a session cost the test moves, and the engine's own bottom answers. */
function setup(on: On, options: { cost?: number | undefined } = {}) {
  const clock = mock.clock(on, { now: 1_000_000 })
  const session = { cost: options.cost }
  const files = { spec: SPEC.replace('- P1 SUCCESS', '- nothing') }
  const agentResults = new Map<string, unknown>()
  let polls = 0
  const failures = { usage: false }

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('command.register', (_, e) => ({ value: { command: e.name } }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('fs.read', () => ({ value: files.spec }))
  on('session.usage', () => {
    polls += 1

    if (failures.usage) throw new Error('no usage')

    return {
      value: {
        startedAt: 0,
        context: {},
        rateLimits: [],
        ...(session.cost === undefined ? {} : { cost: { usd: session.cost } }),
      },
    } as never
  })
  seen.flow = null
  seen.hidden = false
  seen.flowWrites = 0
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'flow') {
      seen.flow = e.value as BuddyFlow | null
      seen.flowWrites += 1
    }
    if (e.plugin === 'buddy' && e.key === 'isHidden') seen.hidden = e.value as boolean

    return next(e)
  })
  on('tool.call', (_, e) => {
    if (e.tool === 'TaskCreate') return { result: { task: { id: '7', subject: e.subject } } }
    if (e.tool === 'Agent') return { result: agentResults.get(e.tool_use_id ?? '') ?? {} } as never
    return { result: {} }
  })
  on('agent.spawn', (_, e) => ({ model: 'claude-sonnet-5-5', agentId: `agent-${e.tool_use_id}` }))

  return { clock, session, files, agentResults, failures, polls: () => polls }
}

type Dollar = Engine

// The test's `$` has no `state` noun; a hook of the test sits beneath the plugin and sees every write it makes.
const seen: { flow: BuddyFlow | null; hidden: boolean; flowWrites: number } = {
  flow: null,
  hidden: false,
  flowWrites: 0,
}

const rawFlow = async (_: Dollar): Promise<BuddyFlow | null> => seen.flow

const isHidden = async (_: Dollar): Promise<boolean> => seen.hidden

const expectNear = (received: number | undefined, expected: number): void => {
  expect(received !== undefined && Math.abs(received - expected) < 1e-6, `${received} is not near ${expected}`).toBe(true)
}

const flowOf = async ($: Dollar): Promise<BuddyFlow> => {
  const flow = await rawFlow($)

  expect(flow).not.toBeNull()

  return flow!
}

async function spawn($: Dollar, id: string, type: string, description: string, prompt = 'p') {
  await $.agent.spawn({ tool_use_id: id, subagentType: `buddy:${type}`, description, prompt } as never)
}

test('a Buddy skill creates a flow and a non-Buddy skill does not', async ($, on) => {
  setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'other:spec' })
  expect(await rawFlow($)).toBeNull()

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  const flow = await flowOf($)

  expect(flow.entry).toBe('develop')
  expect(flow.isWorking).toBe(true)
  expect(flow.stage).toBeUndefined()

  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })
  expect((await flowOf($)).stage).toBe('research')
  expect((await flowOf($)).entry).toBe('develop')
})

// The names a typed `/buddy:develop <args>` arrives under, as a headless Claude Code 2.1.293 run showed.
test('a typed Buddy slash command creates the flow once', async ($, on) => {
  setup(on)
  on('command.run', () => ({}))
  on('skill.prompt', (_, e) => ({ text: e.text }))

  await $.command.run({ command: 'buddy:develop', args: 'add a hello file' } as never)
  await $.skill.prompt({ skill: 'buddy:develop', text: 'develop' } as never)
  const flow = await flowOf($)

  expect(flow.entry).toBe('develop')
  expect(flow.isWorking).toBe(true)
  expect(seen.flowWrites).toBeLessThan(4)
})

test('a typed Buddy skill shows the Desktop band once its turn has settled', async ($, on) => {
  const { clock } = setup(on, { cost: 1 })
  on('command.run', () => ({}))
  on('skill.prompt', (_, e) => ({ text: e.text }))

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.turn.start({ text: '/buddy:research a test', turnId: 't1' })
  await $.command.run({ command: 'buddy:research', args: 'a test' } as never)
  await $.skill.prompt({ skill: 'buddy:research', text: 'research' } as never)
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  await clock.advance(SETTLE_MS)

  const ui = await $.ui.mount({
    plugin: 'buddy',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 20, bodyColumns: 100, scroll: { bodyRows: 19, offset: 0, total: 0 } } as never,
  })

  expect((await ui.findAll({ type: 'Svg' })).length).toBe(1)
})

test('develop marks unrun optional stops skipped once a later stage starts', async ($, on) => {
  setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })

  const early = viewOf(await flowOf($), 1_000_000)
  expect(early.stages.map(stage => [stage.stage, stage.status])).toEqual([
    ['research', 'current'],
    ['innovate', 'pending'],
    ['spec', 'pending'],
    ['implement', 'pending'],
    ['validate', 'pending'],
    ['review', 'pending'],
  ])
  expect(early.stages.map(stage => stage.optional)).toEqual([true, true, true, false, false, false])

  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })

  const later = viewOf(await flowOf($), 1_000_000)
  expect(later.stages.map(stage => [stage.stage, stage.status])).toEqual([
    ['research', 'done'],
    ['innovate', 'skipped'],
    ['spec', 'skipped'],
    ['implement', 'current'],
    ['validate', 'pending'],
    ['review', 'pending'],
  ])
  expect(later.skipped).toEqual(['innovate', 'spec'])
  expect(later.change).toEqual({ from: 'research', to: 'implement', at: 1_000_000, hops: ['innovate', 'spec'] })
})

test('a flow that does not start at develop leaves unrun stops pending', async ($, on) => {
  setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code', agentId: 'agent-x' } as never)

  const view = viewOf(await flowOf($), 1_000_000)

  expect(view.entry).toBe('implement')
  expect(view.skipped).toEqual([])
  expect(view.stages.map(stage => stage.status)).toEqual([
    'pending',
    'pending',
    'pending',
    'done',
    'pending',
    'current',
  ])
})

test('the spec and its AGENT LOG are read into phases with a running one', async ($, on) => {
  const { files } = setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })

  let flow = await flowOf($)
  expect(flow.stage).toBe('spec')
  expect(flow.spec?.title).toBe('Parser upgrade')
  expect(flow.spec?.phases.map(phase => [phase.id, phase.status])).toEqual([
    ['P1', 'pending'],
    ['P2', 'pending'],
  ])

  // The AGENT LOG now records P1.
  files.spec = SPEC
  await $.tool.call({ tool: 'Edit', file_path: SPEC_PATH, old_string: 'a', new_string: 'b' } as never)
  flow = await flowOf($)
  expect(flow.spec?.phases.map(phase => phase.status)).toEqual(['success', 'pending'])

  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-2', 'implementor', 'Implement P2 validation')

  const view = viewOf(await flowOf($), 1_000_000)
  expect(view.phases.map(phase => [phase.id, phase.status])).toEqual([
    ['P1', 'success'],
    ['P2', 'running'],
  ])
  expect(view.phase?.id).toBe('P2')
  expect(view.overall).toMatchObject({ done: 1, total: 2 })
})

test('task progress is kept per loop', async ($, on) => {
  setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-1', 'implementor', 'Implement P1 tokenizer')

  await $.tool.call({
    tool: 'TodoWrite',
    todos: [{ content: 'Host item', status: 'in_progress', activeForm: 'Hosting' }],
  } as never)
  await $.tool.call({
    tool: 'TodoWrite',
    agentId: 'agent-use-1',
    todos: [
      { content: 'Write tokenizer', status: 'completed', activeForm: 'Writing' },
      { content: 'Add tests', status: 'in_progress', activeForm: 'Adding' },
      { content: 'Wire parser', status: 'pending', activeForm: 'Wiring' },
    ],
  } as never)
  await $.tool.call({ tool: 'TaskCreate', agentId: 'agent-use-1', subject: 'Polish', description: 'd' } as never)
  await $.tool.call({ tool: 'TaskUpdate', agentId: 'agent-use-1', taskId: '7', status: 'completed' } as never)

  const flow = await flowOf($)
  expect(flow.tasks.map(task => task.subject)).toEqual(['Host item'])
  expect(flow.agents[0]?.tasks.map(task => [task.subject, task.status])).toEqual([
    ['Write tokenizer', 'completed'],
    ['Add tests', 'in_progress'],
    ['Wire parser', 'pending'],
    ['Polish', 'completed'],
  ])

  const view = viewOf(flow, 1_000_000)
  expect(view.phase?.id).toBe('P1')
  expect(view.phase?.progress).toMatchObject({ done: 2, total: 4 })
  expect(view.bar).toMatchObject({ done: 2, total: 4 })
})

test('tokens are totalled per loop from turn.complete and Agent results and credited to stages and phases', async ($, on) => {
  const { agentResults } = setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })
  await $.turn.start({ text: 'go', turnId: 't1' })

  // The main turn ends while Research is current: 1 000 + 200 tokens credit to Research.
  await $.turn.complete(turn({ usage: usage(1000, 200) }))

  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-1', 'implementor', 'Implement P1 tokenizer')
  await spawn($, 'use-2', 'implementor', 'Implement P2 checks')

  // A subagent ends: its turn carries its own usage, keyed by agentId.
  await $.turn.complete(turn({ agentId: 'agent-use-1', usage: usage(3000, 500) }))
  // The Agent tool result for it reports the same run; the larger total stands, not the sum.
  agentResults.set('use-1', { status: 'completed', agentId: 'agent-use-1', totalTokens: 3500 })
  await $.tool.call({ tool: 'Agent', tool_use_id: 'use-1', description: 'd', prompt: 'p' } as never)

  const afterFirst = await flowOf($)
  expect(afterFirst.mainTokens).toBe(1200)
  expect(afterFirst.stageTokens).toEqual({ research: 1200 })
  expect(afterFirst.agents.map(agent => [agent.toolUseId, agent.tokens, agent.status])).toEqual([
    ['use-1', 3500, 'done'],
    ['use-2', 0, 'running'],
  ])

  // A second subagent is reported only by its Agent result.
  agentResults.set('use-2', {
    status: 'completed',
    agentId: 'agent-use-2',
    totalTokens: 9000,
    resolvedModel: 'claude-opus-5-5',
    usage: {
      input_tokens: 6000,
      output_tokens: 1000,
      cache_read_input_tokens: 2000,
      cache_creation_input_tokens: null,
    },
  })
  await $.tool.call({ tool: 'Agent', tool_use_id: 'use-2', description: 'd', prompt: 'p' } as never)

  const flow = await flowOf($)
  expect(flow.agents[1]).toMatchObject({ tokens: 9000, status: 'done', model: 'claude-opus-5-5' })

  const view = viewOf(flow, 1_000_000)
  const spend = (name: string) => view.stages.find(stage => stage.stage === name)?.spend?.tokens
  expect(spend('research')).toBe(1200)
  expect(spend('implement')).toBe(12_500)
  expect(view.phases.map(phase => [phase.id, phase.spend?.tokens])).toEqual([
    ['P1', 3500],
    ['P2', 9000],
  ])
  expect(view.totals.tokens).toBe(1200 + 3500 + 9000)
  expect(view.agents.map(agent => [agent.type, agent.phase, agent.tokens])).toEqual([
    ['implementor', 'P1', 3500],
    ['implementor', 'P2', 9000],
  ])
})

test('poll deltas credit the current stage and the one running phase; the poll runs only while a turn runs', async ($, on) => {
  const { clock, session, polls } = setup(on, { cost: 10 })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })

  // No main turn is running: the timer reads nothing.
  const idle = polls()
  await clock.advance(9000)
  expect(polls()).toBe(idle)

  await $.turn.start({ text: 'go', turnId: 't1' })
  await spawn($, 'use-1', 'implementor', 'Implement P1 tokenizer')

  // The first reading was the baseline (10); growth after it is the flow's.
  session.cost = 10.5
  await clock.advance(3000)
  expect(polls()).toBeGreaterThan(idle)

  let view = viewOf(await flowOf($), clock.now())
  expect(view.hasCost).toBe(true)
  expectNear(view.totals.cost, 0.5)
  expectNear(view.stages.find(stage => stage.stage === 'implement')?.spend?.cost, 0.5)
  expect(view.stages.find(stage => stage.stage === 'spec')?.spend?.cost).toBeUndefined()
  expectNear(view.phases.find(phase => phase.id === 'P1')?.spend?.cost, 0.5)

  // Two phases running at once: the stage gets the growth, no phase does.
  await spawn($, 'use-2', 'implementor', 'Implement P2 checks')
  session.cost = 11
  await clock.advance(3000)

  view = viewOf(await flowOf($), clock.now())
  expectNear(view.totals.cost, 1)
  expectNear(view.stages.find(stage => stage.stage === 'implement')?.spend?.cost, 1)
  expectNear(view.phases.find(phase => phase.id === 'P1')?.spend?.cost, 0.5)
  expect(view.phases.find(phase => phase.id === 'P2')?.spend?.cost).toBeUndefined()

  // A fall is ignored; the turn's end reads once more and stops the timer.
  session.cost = 10.8
  await $.turn.complete(turn({}))
  view = viewOf(await flowOf($), clock.now())
  expectNear(view.totals.cost, 1)

  const stopped = polls()
  await clock.advance(9000)
  expect(polls()).toBe(stopped)
})

test('a cost poll with no change writes nothing', async ($, on) => {
  const { clock } = setup(on, { cost: 2 })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  const before = seen.flowWrites

  await clock.advance(9000)
  expect(seen.flowWrites).toBe(before)
})

test('without a session cost the cost is hidden and tokens still show', async ($, on) => {
  const { clock } = setup(on)

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await spawn($, 'use-1', 'implementor', 'Implement P1')
  await clock.advance(6000)
  await $.turn.complete(turn({ agentId: 'agent-use-1', usage: usage(100, 50, 'claude-opus-5-5') }))
  await $.turn.complete(turn({ usage: usage(400, 100, 'claude-opus-5-5') }))

  const view = viewOf(await flowOf($), clock.now())

  expect(view.hasCost).toBe(false)
  expect(view.totals).toEqual({ tokens: 650 })
  expect(view.stages.every(stage => stage.spend === undefined || stage.spend.cost === undefined)).toBe(true)
  expect(view.agents[0]).toMatchObject({ tokens: 150, model: 'claude-opus-5-5' })
  expect(view.agents[0]?.cost).toBeUndefined()
  expect(view.party.find(entry => entry.id === 'main')?.cost).toBeUndefined()
})

test('per-agent cost is estimated from the price table; an unknown model shows tokens only', async ($, on) => {
  setup(on, { cost: 1 })

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await spawn($, 'use-1', 'implementor', 'Implement P1')
  await spawn($, 'use-2', 'implementor', 'Implement P2')
  await $.turn.complete(
    turn({
      agentId: 'agent-use-1',
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 100_000,
        cache_read_input_tokens: 500_000,
        cache_creation_input_tokens: 200_000,
        model: 'claude-opus-5-5',
      },
    }),
  )
  await $.turn.complete(turn({ agentId: 'agent-use-2', usage: usage(1000, 1000, 'claude-mystery-9') }))
  await $.turn.complete(turn({ usage: usage(1_000_000, 0, 'claude-sonnet-5-5') }))

  const view = viewOf(await flowOf($), 1_000_000)

  // Opus 5.5: 1M x $4 + 100k x $20 + 500k x $0.20 + 200k x $4 x 1.25 = 4 + 2 + 0.1 + 1 = $7.10
  expectNear(view.agents[0]?.cost, 7.1)
  expect(view.agents[1]?.tokens).toBe(2000)
  expect(view.agents[1]?.cost).toBeUndefined()
  expect(view.party.map(entry => entry.label)).toEqual(['implementor', 'implementor', 'main'])
  expect(view.party.find(entry => entry.id === 'main')).toMatchObject({ tokens: 1_000_000, cost: 2, model: 'claude-sonnet-5-5' })
})

test('the party is the current stage agents plus main', async ($, on) => {
  setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await spawn($, 'use-1', 'researcher', 'Research the parser')
  await $.turn.start({ text: 'go', turnId: 't1' })

  let view = viewOf(await flowOf($), 1_000_000)
  expect(view.party).toEqual([
    { id: 'use-1', label: 'researcher', running: true, tokens: 0 },
    { id: 'main', label: 'main', running: false, tokens: 0 },
  ])

  await $.turn.complete(turn({ agentId: 'agent-use-1', usage: usage(10, 5) }))
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-2', 'implementor', 'Implement P1')

  view = viewOf(await flowOf($), 1_000_000)
  expect(view.party.map(entry => entry.label)).toEqual(['implementor', 'main'])
  expect(view.agents.map(agent => agent.type)).toEqual(['researcher', 'implementor'])
})

test('observer hooks never fail a tool call or a spawn, even when tracking breaks', async ($, on) => {
  const { failures } = setup(on)
  failures.usage = true

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  const read1 = await $.tool.call({ tool: 'Read', file_path: 'src/a.ts' } as never)
  expect(read1.deny).toBeUndefined()

  const ran = await $.agent.spawn({
    tool_use_id: 'use-9',
    subagentType: 'buddy:researcher',
    description: 'd',
    prompt: 'p',
  } as never)
  expect(ran.deny).toBeUndefined()
  expect((await flowOf($)).agents).toHaveLength(1)
})

test('/clear resets the flow, and the next skill shows the band again after Hide', async ($, on) => {
  const { clock } = setup(on)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  expect(await rawFlow($)).toBeNull()

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await clock.advance(SETTLE_MS)
  const ui = await $.ui.mount({
    plugin: 'buddy',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { bodyRows: 19, offset: 0, total: 0 } } as never,
  })
  await ui.press({ key: 'hide' })
  expect(await isHidden($)).toBe(true)

  // A nested skill of the same flow keeps it hidden; a new flow shows it again.
  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })
  expect(await isHidden($)).toBe(true)

  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  await $.tool.call({ tool: 'Skill', skill: 'buddy:spec' })
  expect(await isHidden($)).toBe(false)
})

test('after done, later turns neither credit the flow nor mark it live, and the band stays CLEARED', async ($, on) => {
  const { clock, session } = setup(on, { cost: 2 })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code' })
  session.cost = 2.5
  await $.turn.complete(turn({ usage: usage(1000, 200, 'claude-opus-5-5') }))

  const done = await flowOf($)
  expect(done.isEnded).toBe(true)
  expect(viewOf(done, clock.now()).mode).toBe('done')
  expect(done.costTotal).toBe(0.5)

  // Later work that is not Buddy's.
  await $.turn.start({ text: 'other', turnId: 't2' })
  expect((await flowOf($)).isWorking).toBe(false)
  session.cost = 4
  await clock.advance(6000)
  await $.turn.complete(turn({ usage: usage(5000, 500, 'claude-opus-5-5') }))

  const later = await flowOf($)
  expect(later.mainTokens).toBe(1200)
  expect(later.costTotal).toBe(0.5)

  const band = await $.ui.mount({
    plugin: 'buddy',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 20, bodyColumns: 100, scroll: { bodyRows: 19, offset: 0, total: 0 } } as never,
  })
  const source = (await band.findAll({ type: 'Svg' })).map(svg => String(svg.props.source)).join('')
  expect(source).toContain('CLEARED')
  expect(source).not.toContain('>LIVE<')
})

test('without session.start (a reload where other hooks arrive first) the first turn or tool call starts the gated timers', async ($, on) => {
  const { clock, polls } = setup(on, { cost: 1 })

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })

  const before = polls()
  await clock.advance(6000)
  expect(polls()).toBeGreaterThan(before)

  // The gate is the state's turn flag: after the main turn ends, the timers read nothing.
  await $.turn.complete(turn({}))
  const idle = polls()
  await clock.advance(6000)
  expect(polls()).toBe(idle)
})

test('a review still running at main turn end keeps the flow open; remediation after the end reopens the develop flow', async ($, on) => {
  const { clock } = setup(on, { cost: 1 })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-r', 'code-reviewer', 'Review the change')
  await $.turn.complete(turn({ usage: usage(100, 10) }))

  const mid = await flowOf($)
  expect(mid.isEnded).toBeUndefined()
  expect(viewOf(mid, clock.now()).mode).not.toBe('done')

  // The background review ends with the main loop idle at review: the flow is done.
  await $.turn.complete(turn({ agentId: 'agent-use-r', usage: usage(500, 50) }))
  const done = await flowOf($)
  expect(done.isEnded).toBe(true)
  expect(viewOf(done, clock.now()).mode).toBe('done')

  // develop goes back to implementation for a finding: the same flow reopens.
  await $.turn.start({ text: '', turnId: 't2' })
  await spawn($, 'use-i', 'implementor', 'Fix review finding F1')
  const after = await flowOf($)
  expect(after.entry).toBe('develop')
  expect(after.isEnded).toBeUndefined()
  expect(after.stage).toBe('implement')
  expect(after.visited).toEqual(['implement', 'review'])
  expect(after.agents.map(agent => agent.type)).toEqual(['code-reviewer', 'implementor'])
  expect(viewOf(after, clock.now()).mode).toBe('working')
})

test('an ended flow takes no main-loop activity, task lists or spec reads from later work', async ($, on) => {
  setup(on, { cost: 1 })

  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code' })
  await $.turn.complete(turn({}))
  const done = await flowOf($)
  expect(done.isEnded).toBe(true)

  await $.turn.start({ text: 'other', turnId: 't2' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/other.ts', old_string: 'a', new_string: 'b' } as never)
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [{ content: 'Unrelated', status: 'in_progress', activeForm: 'Doing' }],
  } as never)
  await $.tool.call({ tool: 'TaskCreate', subject: 'Unrelated task', description: 'd' } as never)
  await $.tool.call({ tool: 'Read', file_path: SPEC_PATH } as never)

  const later = await flowOf($)
  expect(later.activity).toBe(done.activity)
  expect(later.tasks).toEqual([])
  expect(later.spec).toBeUndefined()
  expect(viewOf(later, 2_000_000).mode).toBe('done')
})

/** develop run to the end: the review skill, then the main turn ends with nothing running. */
async function endedDevelop($: Dollar) {
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code' })
  await $.turn.complete(turn({ usage: usage(1000, 0) }))
  expect((await flowOf($)).isEnded).toBe(true)
}

/** One unrelated main turn with tokens and session cost; returns the flow before and after it. */
async function unrelatedTurn($: Dollar, clock: { advance: (ms: number) => Promise<unknown> }, session: { cost: number | undefined }) {
  const before = await flowOf($)
  await $.turn.start({ text: 'other', turnId: 'tx' })
  session.cost = (session.cost ?? 0) + 4
  await clock.advance(6000)
  await $.turn.complete(turn({ usage: usage(6000, 1000, 'claude-opus-5-5') }))

  return { before, after: await flowOf($) }
}

test('develop reopened at Validate waits at idle; its next turn without Buddy work ends it and credits nothing', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await endedDevelop($)

  await $.turn.start({ text: 'again', turnId: 't2' })
  await spawn($, 'use-t', 'test-runner', 'Run the tests')
  expect((await flowOf($)).stage).toBe('validate')
  await $.turn.complete(turn({}))
  expect((await flowOf($)).isEnded).toBeUndefined()

  await $.turn.complete(turn({ agentId: 'agent-use-t', usage: usage(300, 30) }))
  const paused = await flowOf($)
  expect([paused.stage, paused.isEnded, paused.isPendingEnd, viewOf(paused, clock.now()).mode]).toEqual(['validate', undefined, true, 'waiting'])

  const { before, after } = await unrelatedTurn($, clock, session)
  expect(after.isEnded).toBe(true)
  expect(after.mainTokens).toBe(before.mainTokens)
  expect(after.stageCost).toEqual(before.stageCost)
  expect(after.costTotal).toBe(before.costTotal)
})

test('a reopened flow of another entry ends at its next idle point, even before review', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code' })
  await $.turn.complete(turn({}))
  expect((await flowOf($)).isEnded).toBe(true)

  await $.turn.start({ text: 'again', turnId: 't2' })
  await spawn($, 'use-r', 'researcher', 'Look something up')
  const reopened = await flowOf($)
  expect([reopened.entry, reopened.stage, reopened.isEnded]).toEqual(['review-code', 'research', undefined])
  await $.turn.complete(turn({ agentId: 'agent-use-r', usage: usage(200, 0) }))
  await $.turn.complete(turn({ usage: usage(500, 0) }))
  const ended = await flowOf($)
  expect([ended.isEnded, viewOf(ended, clock.now()).mode]).toEqual([true, 'done'])

  const { before, after } = await unrelatedTurn($, clock, session)
  expect(after.mainTokens).toBe(before.mainTokens)
  expect(after.stageCost).toEqual(before.stageCost)
})

/** develop ended at review, then a fix turn reopens it with an implementor and pauses for the person. */
async function pausedRemediation($: Dollar) {
  await endedDevelop($)
  await $.turn.start({ text: 'fix', turnId: 't2' })
  await spawn($, 'use-i', 'implementor', 'Fix finding F1')
  await $.turn.complete(turn({ agentId: 'agent-use-i', usage: usage(300, 30) }))
  await $.turn.complete(turn({ usage: usage(100, 0) }))
}

test('a reopened develop run that pauses before review stays YOUR TURN', async ($, on) => {
  const { clock } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await pausedRemediation($)

  const paused = await flowOf($)
  const view = viewOf(paused, clock.now())
  expect([paused.stage, paused.isEnded, view.mode]).toEqual(['implement', undefined, 'waiting'])
  expect(view.stages.find(stage => stage.stage === 'implement')?.status).toBe('current')
  expect(paused.mainTokens).toBe(1100)
})

test('after the pause, a turn that starts Buddy work goes on and its held cost is credited', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await pausedRemediation($)
  const paused = await flowOf($)

  await $.turn.start({ text: 'option B', turnId: 't3' })
  await $.tool.call({ tool: 'Edit', file_path: 'src/a.ts', old_string: 'a', new_string: 'b' } as never)
  session.cost = 3
  await clock.advance(6000)
  expect((await flowOf($)).heldCost).toBe(2)

  await spawn($, 'use-r2', 'code-reviewer', 'Re-review')
  const going = await flowOf($)
  expect([going.isPendingEnd, going.heldCost, going.stage]).toEqual([undefined, undefined, 'review'])
  expect(going.costTotal).toBe((paused.costTotal ?? 0) + 2)
  expect(going.stageCost.implement).toBe((paused.stageCost.implement ?? 0) + 2)

  session.cost = 4
  await clock.advance(6000)
  await $.turn.complete(turn({ agentId: 'agent-use-r2', usage: usage(10, 1) }))
  await $.turn.complete(turn({ usage: usage(700, 0) }))
  const end = await flowOf($)
  expect(end.isEnded).toBe(true)
  expect(end.costTotal).toBe((paused.costTotal ?? 0) + 3)
  expect(end.mainTokens).toBe(paused.mainTokens + 700)
})

test('after the pause, a turn without Buddy work ends the flow and credits nothing from that turn', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await pausedRemediation($)

  const { before, after } = await unrelatedTurn($, clock, session)
  expect(after.isEnded).toBe(true)
  expect(after.mainTokens).toBe(before.mainTokens)
  expect(after.costTotal).toBe(before.costTotal)
  expect(after.stageCost).toEqual(before.stageCost)
})

test('a Buddy spawn by a subagent outside an ended flow does not reopen it', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await endedDevelop($)
  await $.turn.start({ text: 'unrelated', turnId: 't2' })
  await $.turn.complete(turn({ usage: usage(1, 0) }))
  const ended = await flowOf($)

  await $.agent.spawn({
    tool_use_id: 'use-x',
    subagentType: 'buddy:researcher',
    description: 'look',
    prompt: 'p',
    parentAgentId: 'stranger',
    background: true,
  } as never)
  await $.turn.complete(turn({ agentId: 'agent-use-x', usage: usage(10, 1) }))
  const after = await flowOf($)
  expect([after.isEnded, after.isWorking, after.agents.length]).toEqual([true, false, ended.agents.length])
  expect(viewOf(after, clock.now()).mode).toBe('done')

  const { before, after: later } = await unrelatedTurn($, clock, session)
  expect(later.mainTokens).toBe(before.mainTokens)

  // Reopened while no main turn runs, a flow is not marked working.
  expect(reopenFlow(ended, false).isWorking).toBe(false)
})

test('a Skill call from a subagent outside the flow does not reopen an ended flow', async ($, on) => {
  setup(on, { cost: 1 })
  await endedDevelop($)

  await $.tool.call({ tool: 'Skill', skill: 'buddy:test-runner', agentId: 'stranger' } as never)
  const flow = await flowOf($)
  expect([flow.stage, flow.isEnded]).toEqual(['review', true])
})

test('/buddy-mod toggles the pane and answers with no text or context', async ($, on) => {
  setup(on)
  const panes: string[] = []
  const calls: string[] = []
  on('ui.panes', () => ({ value: panes.map(id => ({ id, title: 'Buddy' })) }) as never)
  on('ui.open', (_, e) => {
    calls.push(`open ${e.id}`)
    panes.push(e.id)
    return { value: { isPlaced: true } } as never
  })
  on('ui.close', (_, e) => {
    calls.push(`close ${e.id}`)
    panes.splice(panes.indexOf(e.id), 1)
    return { value: undefined } as never
  })

  const opened = await $.command.run({ command: 'buddy-mod', args: '', origin: { kind: 'user' } } as never)
  const closed = await $.command.run({ command: 'buddy-mod', args: '', origin: { kind: 'user' } } as never)

  expect(calls).toEqual(['open buddy-mod', 'close buddy-mod'])
  for (const answer of [opened, closed]) {
    expect(answer.text).toBeUndefined()
    expect(answer.context).toBeUndefined()
  }
})

test('a turn that ends a paused flow leaves no tasks, spec, activity or stage of its own behind', async ($, on) => {
  const { clock } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await pausedRemediation($)
  const paused = await flowOf($)

  await $.turn.start({ text: 'other', turnId: 't3' })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [{ content: 'Unrelated', status: 'in_progress', activeForm: 'Doing' }],
  } as never)
  await $.tool.call({ tool: 'Read', file_path: '.ai/worklog/20261009_other/spec_other.md' } as never)
  await $.tool.call({ tool: 'Edit', file_path: 'src/other.ts', old_string: 'a', new_string: 'b' } as never)
  expect((await flowOf($)).tasks).toHaveLength(1)
  await $.turn.complete(turn({ usage: usage(50, 0) }))

  const ended = await flowOf($)
  expect(ended.isEnded).toBe(true)
  expect(ended.pendingSnapshot).toBeUndefined()
  expect(ended.tasks).toEqual(paused.tasks)
  expect(ended.spec).toEqual(paused.spec)
  expect(ended.activity).toEqual(paused.activity)
  expect(ended.toolCount).toBe(paused.toolCount)
  expect([ended.stage, ended.visited]).toEqual([paused.stage, paused.visited])
  expect(viewOf(ended, clock.now()).mode).toBe('done')
})

test('a background subagent loading its skill after the main turn ended does not mark the flow working', async ($, on) => {
  const { clock, session } = setup(on, { cost: 1 })
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await spawn($, 'use-r', 'code-reviewer', 'Review the change')
  await $.turn.complete(turn({}))

  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code', agentId: 'agent-use-r' } as never)
  expect((await flowOf($)).isWorking).toBe(false)

  await $.turn.complete(turn({ agentId: 'agent-use-r', usage: usage(500, 50) }))
  expect((await flowOf($)).isEnded).toBe(true)

  const { before, after } = await unrelatedTurn($, clock, session)
  expect(after.mainTokens).toBe(before.mainTokens)
  expect(after.costTotal).toBe(before.costTotal)
})

test('an ended flow still takes new results from its own spec file, and nothing from another spec', async ($, on) => {
  const { files } = setup(on, { cost: 1 })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:review-code' })
  await $.turn.complete(turn({}))
  const ended = await flowOf($)
  expect(ended.isEnded).toBe(true)
  expect(ended.spec?.phases.map(phase => phase.status)).toEqual(['pending', 'pending'])

  files.spec = SPEC.replace('- P1 SUCCESS', '- P1 SUCCESS (revision 2)\n- P2 BLOCKED (revision 2)')
  await $.tool.call({ tool: 'Read', file_path: SPEC_PATH } as never)
  const refreshed = await flowOf($)
  expect(refreshed.spec?.phases.map(phase => phase.status)).toEqual(['success', 'blocked'])
  expect([refreshed.isEnded, refreshed.stage, refreshed.tasks, refreshed.mainTokens]).toEqual([true, 'review', ended.tasks, ended.mainTokens])

  await $.tool.call({ tool: 'Read', file_path: '.ai/worklog/20261009_other/spec_other.md' } as never)
  expect((await flowOf($)).spec?.path).toBe(SPEC_PATH)
})
