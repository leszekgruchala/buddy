import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { On, RenderElement } from 'claude-code'

import { SETTLE_MS, shows } from './fixtures'

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

/** The engine's own answers, with a record of the commands the mod registers and the flows it writes. */
function setup(on: On) {
  const clock = mock.clock(on, { now: 1_000_000 })
  const seen = { commands: [] as string[], flowWrites: 0 }
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', (_, e) => {
    seen.commands.push(e.name)

    return { value: { command: e.name } } as never
  })
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('tool.call', () => ({ result: {} }))
  on('state.set', (_, e, next) => {
    if (e.plugin === 'buddy' && e.key === 'flow') seen.flowWrites += 1

    return next(e)
  })

  return { clock, seen }
}

async function startResearch($: Engine, clock: ReturnType<typeof mock.clock>) {
  await $.session.start({ cwd: '/work', surface: null, isInteractive: false })
  await $.tool.call({ tool: 'Skill', skill: 'buddy:research' })
  await clock.advance(SETTLE_MS)
}

test('without options the mod is on: it registers /buddy-mod and draws the band', async ($, on) => {
  const { clock, seen } = setup(on)
  await startResearch($, clock)

  expect(seen.commands).toEqual(['buddy-mod'])
  expect(seen.flowWrites).toBeGreaterThan(0)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'buddy', surface, component: 'AbovePrompt', props: BAND_PROPS })
    expect(await shows(ui, /Researching/)).toBe(true)
    await ui.unmount()
  }
})

test('show_mod true keeps the mod on', { options: { show_mod: true } }, async ($, on) => {
  const { clock, seen } = setup(on)
  await startResearch($, clock)

  expect(seen.commands).toEqual(['buddy-mod'])
  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  expect(await shows(ui, /Researching/)).toBe(true)
})

test('show_mod false registers no command, tracks no flow, and draws no band or pane', { options: { show_mod: false } }, async ($, on) => {
  const { clock, seen } = setup(on)
  await startResearch($, clock)

  expect(seen.commands).toEqual([])
  expect(seen.flowWrites).toBe(0)
  for (const surface of SURFACES) {
    const band = await $.ui.mount({ plugin: 'buddy', surface, component: 'AbovePrompt', props: BAND_PROPS })
    expect(await shows(band, /Buddy|Researching/)).toBe(false)
    expect(await band.find({ key: 'engine' })).toBeDefined()
    await band.unmount()

    const pane = await $.ui.mount({ plugin: 'buddy', surface, component: 'Pane', props: PANE_PROPS, requestId: 'buddy-mod' })
    expect(await shows(pane, /Buddy/)).toBe(false)
    await pane.unmount()
  }
})
