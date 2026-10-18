import { expect, mock, test } from 'claude-code/testing'

import type { RenderElement } from 'claude-code'

import { SETTLE_MS, shows, SPEC } from './fixtures'

const SPEC_PATH = '.ai/worklog/20261008_parser/spec_parser.md'
const BAND_PROPS = {
  hasSurvey: false,
  isWorking: true,
  maxRows: 20,
  bodyColumns: 100,
  scroll: { bodyRows: 19, offset: 0, total: 0 },
} as never

test('the band follows a develop run into the implementation phase', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000 })
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('fs.read', () => ({ value: SPEC.replace('- P1 SUCCESS', '- nothing') }))
  on('tool.call', (_, e) => {
    if (e.tool === 'TaskCreate') return { result: { task: { id: '7', subject: e.subject } } }
    return { result: {} }
  })
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'agent-1' }))

  await $.tool.call({ tool: 'Skill', skill: 'buddy:develop' })
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
  await clock.advance(SETTLE_MS)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'buddy', surface, component: 'AbovePrompt', props: BAND_PROPS })

    expect(await shows(ui, /Implementing/)).toBe(true)
    expect(await shows(ui, /P1/)).toBe(true)
    expect(await shows(ui, /1\/2 tasks/i)).toBe(true)
    // The terminal follows each tool call; Desktop names the running task, so tool calls do not redraw its cards.
    expect(await ui.find({ text: surface === 'terminal' ? /Editing src\/tok\.ts/ : /Implement P1 tokenizer/ })).toBeDefined()
    await ui.unmount()
  }
})

test('nothing shows without a Buddy skill', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', ($, e) => h($.ui.resolve(e).Box, { key: 'engine' }) as RenderElement)
  on('tool.call', () => ({ result: {} }))
  await $.tool.call({ tool: 'Skill', skill: 'other:spec' })

  const ui = await $.ui.mount({ plugin: 'buddy', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS })
  expect(await ui.find({ text: /Buddy/ })).toBeUndefined()
})
