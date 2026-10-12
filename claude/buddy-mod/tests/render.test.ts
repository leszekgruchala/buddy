import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { On, RenderElement } from 'claude-code'

import type { BuddyFlow } from '../types'
import { SETTLE_MS, shows, SPEC, svgSources } from './fixtures'

const SPEC_PATH = '.ai/worklog/20261008_parser/spec_parser.md'
const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 20,
  bodyColumns: 100,
  scroll: { bodyRows: 19, offset: 0, total: 0 },
} as never
const PANE_PROPS = {
  title: 'Buddy',
  isFocused: false,
  bodyColumns: 80,
  placement: 'dock',
  scroll: { bodyRows: 40, offset: 0, total: 0 },
} as never
const SURFACES = ['terminal', 'desktop'] as const
const seen: { flow: BuddyFlow | null | undefined; clock?: ReturnType<typeof mock.clock> } = { flow: undefined }

function setup(on: On, now: number) {
  const clock = mock.clock(on, { now })
  seen.flow = undefined
  seen.clock = clock
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('fs.read', () => ({ value: SPEC.replace('- P1 SUCCESS', '- nothing') }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', (_, e) => (e.tool === 'TaskCreate' ? { result: { task: { id: '7', subject: e.subject } } } : { result: {} }))
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'agent-1' }))
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'flow') seen.flow = e.value as BuddyFlow | null

    return next(e)
  })

  return clock
}

/** A develop run: research, Innovate skipped, the spec, then an implementor on P1 with one of two tasks done. */
async function sampleRun($: Engine, mainTokens: { input: number; output: number }) {
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })
  await $.tool.call({ tool: 'Write', file_path: SPEC_PATH, content: SPEC })
  await $.agent.spawn({
    tool_use_id: 'use-1',
    subagentType: 'buddy:implementor',
    description: 'Implement P1 tokenizer',
    prompt: 'id: P1',
  } as never)
  await $.tool.call({
    tool: 'TodoWrite',
    agentId: 'agent-1',
    todos: [
      { content: 'Write tokenizer', status: 'completed', activeForm: 'Writing tokenizer' },
      { content: 'Add tests', status: 'in_progress', activeForm: 'Adding tests' },
    ],
  } as never)
  await $.tool.call({ tool: 'Edit', agentId: 'agent-1', file_path: 'src/tok.ts', old_string: 'a', new_string: 'b' } as never)
  await $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: 't',
    reason: 'answer',
    usage: { input_tokens: mainTokens.input, output_tokens: mainTokens.output, model: 'claude-opus-5-5' },
  } as never)
  await seen.clock?.advance(SETTLE_MS)
}

test('band and pane show the run on terminal and desktop, Svg cards on desktop', async ($, on) => {
  setup(on, 1_000_000)
  await sampleRun($, { input: 30_000, output: 12_000 })

  for (const surface of SURFACES) {
    for (const component of ['AbovePrompt', 'Pane'] as const) {
      const ui =
        component === 'AbovePrompt'
          ? await $.ui.mount({ plugin: 'buddy', surface, component, props: BAND_PROPS })
          : await $.ui.mount({ plugin: 'buddy', surface, component, props: PANE_PROPS, requestId: 'buddy-mod' })
      const where = `${component} on ${surface}`

      expect(await shows(ui, component === 'AbovePrompt' ? /Implementing/ : /Implement ready · your turn/), `headline, ${where}`).toBe(true)
      expect(await shows(ui, /\bP1\b/), `phase id, ${where}`).toBe(true)
      expect(await shows(ui, /1\/2 tasks/i), `task count, ${where}`).toBe(true)
      expect(await shows(ui, /42k/i), `total tokens, ${where}`).toBe(true)
      expect(await shows(ui, /SKIPPED/), `skipped stop, ${where}`).toBe(true)
      expect(await shows(ui, /implementor/i), `party entry, ${where}`).toBe(true)

      if (surface === 'desktop') {
        const svgs = await ui.findAll({ type: 'Svg' })
        expect(svgs.length, `Svg, ${where}`).toBeGreaterThan(0)
        // Every card gets its own size, so the surface draws it at scale 1 instead of fitting it.
        for (const svg of svgs) {
          expect(svg.props.width, `Svg width, ${where}`).toBe(680)
          // A sandboxed frame blanks on each Desktop rebuild; an image does not (see AGENTS.md).
          expect(svg.props.isInteractive, `Svg drawn as an image, ${where}`).toBeUndefined()
          expect(String(svg.props.source)).toContain(`height="${String(svg.props.height)}"`)
        }
        // The skipped stop is struck through; the band's party chip names the phase.
        expect(await svgSources(ui)).toContain('text-decoration="line-through"')
      } else {
        expect(await ui.findAll({ type: 'Svg' })).toHaveLength(0)
      }

      if (component === 'AbovePrompt') {
        expect(await shows(ui, /IMPLEMENTOR P1|implementor P1/), `party chip, ${where}`).toBe(true)
        // The phase in focus says where it stands in the spec.
        expect(await shows(ui, surface === 'terminal' ? /1\/2 Replace/ : />1\/2<\/text>/), `phase position, ${where}`).toBe(true)
        // Desktop names the running task, not each tool call: a tool call must not redraw the cards.
        const doing = surface === 'terminal' ? /Editing src\/tok\.ts/ : /implementor: Implement P1 tokenizer/
        expect(await ui.find({ text: doing }), `activity, ${where}`).toBeDefined()
      }

      await ui.unmount()
    }
  }
})

test('Hide empties the band; Clear in the pane resets the flow', async ($, on) => {
  setup(on, 1_000_000)
  on('ui.close', () => ({ value: undefined }) as never)
  await sampleRun($, { input: 30_000, output: 12_000 })

  const terminal = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  const desktop = await $.ui.mount({ plugin: 'buddy', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })

  expect(await shows(terminal, /Implementing/)).toBe(true)
  expect(await shows(desktop, /Implementing/)).toBe(true)
  await desktop.press({ key: 'hide' })
  await terminal.redraw()
  expect(await shows(desktop, /Implementing/)).toBe(false)
  expect(await desktop.findAll({ type: 'Svg' })).toHaveLength(0)
  expect(await shows(terminal, /Implementing/)).toBe(false)
  await terminal.unmount()
  await desktop.unmount()

  const pane = await $.ui.mount({ plugin: 'buddy', surface: 'desktop', component: 'Pane', props: PANE_PROPS, requestId: 'buddy-mod' })
  await pane.press({ key: 'reset' })
  await seen.clock?.advance(SETTLE_MS)
  await pane.drawn()
  expect(seen.flow).toBeNull()
  expect(await pane.find({ text: /No Buddy workflow yet/ })).toBeDefined()
})

test('Svg sources stay identical across redraws without a change; the walk plays once per stage change', async ($, on) => {
  const clock = setup(on, 7_000_000)
  await sampleRun($, { input: 5_000, output: 2_100 })

  const band = await $.ui.mount({ plugin: 'buddy', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  const first = await svgSources(band)
  const walk = /keyTimes="0\.000;/

  // The stage just changed from Spec to Implement: the critter walks there.
  expect(first).toMatch(walk)

  await clock.advance(61_000)
  await band.redraw()
  expect(await svgSources(band)).toBe(first)
  // No clock on Desktop: its tick would redraw the cards each second.
  expect(await band.find({ text: /1:01/ })).toBeUndefined()

  // Something the card shows changes later: the new source no longer replays the walk.
  await $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: 't2',
    reason: 'answer',
    usage: { input_tokens: 9_000, output_tokens: 1_000, model: 'claude-opus-5-5' },
  } as never)
  await clock.advance(SETTLE_MS)
  await band.redraw()
  const later = await svgSources(band)

  expect(later).not.toBe(first)
  expect(later).not.toMatch(walk)
})

test('a walk goes into one source only: a task change inside the walk window draws at rest', async ($, on) => {
  const clock = mock.clock(on, { now: 9_000_000 })
  const session = { cost: 1 }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('session.usage', () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: session.cost } } }) as never)
  on('tool.call', () => ({ result: {} }))
  on('agent.spawn', (_, e) => ({ model: 'claude-sonnet-5-5', agentId: `agent-${e.tool_use_id}` }))
  const walk = /keyTimes="0\.000;/

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.agent.spawn({ tool_use_id: 'r1', subagentType: 'buddy:researcher', description: 'Research', prompt: 'p' } as never)
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  await clock.advance(7000)
  await ui.drawn()

  await $.agent.spawn({ tool_use_id: 'i1', subagentType: 'buddy:implementor', description: 'Implement P1', prompt: 'p' } as never)
  await clock.advance(SETTLE_MS)
  await ui.drawn()
  const first = await svgSources(ui)
  expect(first).toMatch(walk)

  // A task list changes the card 3 s later, inside the walk window.
  await clock.advance(3000)
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [{ content: 'Write tokenizer', status: 'in_progress', activeForm: 'Writing tokenizer' }],
  } as never)
  await clock.advance(SETTLE_MS)
  await ui.drawn()
  const second = await svgSources(ui)
  expect(second).not.toBe(first)
  expect(second).not.toMatch(walk)
})

test('Desktop cards redraw only for what they show: never for a tool call or the tick, for cost once a minute', async ($, on) => {
  const clock = mock.clock(on, { now: 11_000_000 })
  const session = { cost: 1 }
  let shownWrites = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('session.usage', () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: session.cost } } }) as never)
  on('tool.call', () => ({ result: {} }))
  on('agent.spawn', (_, e) => ({ model: 'claude-sonnet-5-5', agentId: `agent-${e.tool_use_id}` }))
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'shown') shownWrites += 1

    return next(e)
  })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.agent.spawn({ tool_use_id: 'r1', subagentType: 'buddy:researcher', description: 'Map the parser', prompt: 'p' } as never)
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'desktop', component: 'AbovePrompt', props: BAND_PROPS })
  await clock.advance(1000)
  await ui.drawn()
  const writes = shownWrites
  const first = await svgSources(ui)

  expect(await shows(ui, /researcher: Map the parser/)).toBe(true)

  // Tool calls, the elapsed tick and cost polls inside the minute leave the shown flow as it was.
  await $.tool.call({ tool: 'Read', agentId: 'agent-r1', file_path: 'src/a.ts' } as never)
  await $.tool.call({ tool: 'Grep', agentId: 'agent-r1', pattern: 'parse' } as never)
  session.cost = 1.4
  await clock.advance(30_000)
  await ui.drawn()

  expect(shownWrites).toBe(writes)
  expect(await svgSources(ui)).toBe(first)

  // A minute after the last redraw, the new cost shows.
  await clock.advance(31_000)
  await ui.drawn()

  expect(shownWrites).toBe(writes + 1)
  expect(await svgSources(ui)).not.toBe(first)

  // The end of the turn shows the latest cost at once, with its usage and the idle state in one redraw.
  session.cost = 1.9
  await clock.advance(3000)
  expect(shownWrites).toBe(writes + 1)
  await $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    usage: { input_tokens: 4_000, output_tokens: 900, model: 'claude-opus-5-5' },
  } as never)

  // At once, so it shares the redraw Desktop makes for the end of the turn.
  expect(shownWrites).toBe(writes + 2)
  await clock.advance(SETTLE_MS)
  expect(shownWrites).toBe(writes + 2)
})

test('a task change inside the cost minute redraws the Desktop cards with the cost they already show', async ($, on) => {
  const clock = mock.clock(on, { now: 12_000_000 })
  const session = { cost: 1 }
  const shown: { flow: BuddyFlow | null; writes: number } = { flow: null, writes: 0 }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('session.usage', () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: session.cost } } }) as never)
  on('tool.call', () => ({ result: {} }))
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'shown') {
      shown.flow = e.value as BuddyFlow | null
      shown.writes += 1
    }

    return next(e)
  })
  const todos = (done: number) =>
    ({
      tool: 'TodoWrite',
      todos: ['Write tokenizer', 'Add tests', 'Wire parser'].map((content, i) => ({
        content,
        status: i < done ? 'completed' : 'pending',
        activeForm: content,
      })),
    }) as never

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:implement' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call(todos(0))
  await clock.advance(SETTLE_MS)
  const writes = shown.writes
  const cost = shown.flow?.costTotal

  // The cost rises, and a task is done half a minute later: the bar moves, the cost stays.
  session.cost = 1.4
  await clock.advance(30_000)
  await $.tool.call(todos(1))
  await clock.advance(SETTLE_MS)

  expect(shown.writes).toBe(writes + 1)
  expect(shown.flow?.tasks.filter(task => task.status === 'completed')).toHaveLength(1)
  expect(shown.flow?.costTotal).toBe(cost)

  // A minute after the cost last showed, the new cost shows.
  await clock.advance(31_000)

  expect(shown.writes).toBe(writes + 2)
  expect(Math.abs((shown.flow?.costTotal ?? 0) - (cost ?? 0) - 0.4)).toBeLessThan(1e-9)
})

test('a subagent that ends redraws the Desktop cards once for its usage, its result and the cost', async ($, on) => {
  const clock = mock.clock(on, { now: 13_000_000 })
  const session = { cost: 1 }
  let shownWrites = 0
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => ({ value: { command: e.name } }) as never)
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('session.usage', () => ({ value: { startedAt: 0, context: {}, rateLimits: [], cost: { usd: session.cost } } }) as never)
  on('tool.call', (_, e) =>
    e.tool === 'Agent' ? { result: { totalTokens: 52_000, usage: { input_tokens: 50_000, output_tokens: 2_000 } } } : { result: {} },
  )
  on('agent.spawn', (_, e) => ({ model: 'claude-sonnet-5-5', agentId: `agent-${e.tool_use_id}` }))
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'shown') shownWrites += 1

    return next(e)
  })

  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.agent.spawn({ tool_use_id: 'r1', subagentType: 'buddy:researcher', description: 'Map the parser', prompt: 'p' } as never)
  await clock.advance(SETTLE_MS)
  const writes = shownWrites

  session.cost = 1.6
  await $.turn.complete({
    answer: '',
    durationMs: 1,
    isAborted: false,
    turnId: 'r',
    agentId: 'agent-r1',
    reason: 'answer',
    usage: { input_tokens: 50_000, output_tokens: 2_000, model: 'claude-sonnet-5-5' },
  } as never)
  await $.tool.call({ tool: 'Agent', tool_use_id: 'r1', description: 'Map the parser', prompt: 'p', subagent_type: 'buddy:researcher' } as never)
  await clock.advance(SETTLE_MS)

  expect(shownWrites).toBe(writes + 1)
})
