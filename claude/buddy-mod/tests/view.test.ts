import { expect, test } from 'claude-code/testing'

import { bandSvg, partySvg, phasesSvg } from '../hooks/art'
import { enterStage, makeAgent, newFlow, parseSpec, startFlowSkill, startsNewFlow } from '../hooks/model'
import { applyAgentResult, applyCost, applyTurnComplete, estimateCost } from '../hooks/usage'
import { formatCost, formatTokens, viewOf } from '../hooks/view'
import { SPEC } from './fixtures'

test('the first cost reading is a baseline, a fall is ignored, a rise is credited once', () => {
  const start = enterStage(newFlow('develop', 0), 'implement', 0)
  const baseline = applyCost(start, 5)

  expect(baseline.costLast).toBe(5)
  expect(baseline.costTotal).toBe(0)
  expect(applyCost(baseline, 5)).toBe(baseline)

  const down = applyCost(baseline, 4)
  expect(down.costLast).toBe(4)
  expect(down.costTotal).toBe(0)

  const up = applyCost(down, 6)
  expect(up.costTotal).toBe(2)
  expect(up.stageCost).toEqual({ implement: 2 })
  expect(up.phaseCost).toEqual({})
})

test('the price table knows the 5.x families and leaves other models unpriced', () => {
  const counts = { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0 }

  expect(estimateCost('claude-opus-5-5', counts)).toBe(24)
  expect(estimateCost('claude-sonnet-5-5', counts)).toBe(12)
  expect(estimateCost('claude-haiku-5-5', counts)).toBe(0.6)
  expect(estimateCost('claude-fable-5-1', counts)).toBe(60)
  expect(estimateCost('claude-opus-4-1', counts)).toBeUndefined()
  expect(estimateCost(undefined, counts)).toBeUndefined()
})

test('a flow from an older version gets its usage fields filled', () => {
  const old = { ...newFlow('develop', 0) } as Record<string, unknown>

  delete old.stageTokens
  delete old.mainTokens

  const flow = applyTurnComplete(old as never, {
    reason: 'answer',
    usage: { input_tokens: 10, output_tokens: 5, model: 'claude-sonnet-5-5' },
  })

  expect(flow.mainTokens).toBe(15)
})

test('entering a nested skill keeps the flow, a different top-level skill replaces it', () => {
  const develop = newFlow('develop', 0)

  expect(startsNewFlow(null, 'spec', undefined)).toBe(true)
  expect(startsNewFlow(develop, 'research', undefined)).toBe(false)
  expect(startsNewFlow(develop, 'research', 'agent-1')).toBe(false)
  expect(startsNewFlow(newFlow('implement', 0), 'research', undefined)).toBe(true)
  expect(startsNewFlow(newFlow('implement', 0), 'change-report', undefined)).toBe(true)
  expect(startFlowSkill(develop, 'research', undefined, 5).entry).toBe('develop')
  expect(startFlowSkill(newFlow('spec', 0), 'implement', undefined, 5).entry).toBe('implement')

  // A new implementation keeps the spec of a paused one, never the spec of a run that has ended.
  const implementing = { ...newFlow('implement', 0), spec: parseSpec('spec_parser.md', SPEC)! }
  expect(startFlowSkill({ ...implementing, isEnded: true }, 'implement', undefined, 5).spec).toBeUndefined()
  expect(startFlowSkill({ ...newFlow('develop', 0), spec: implementing.spec }, 'implement', undefined, 5).spec).toBeDefined()
})

test('a typed skill later on the track carries the run on; one at or before its last stop starts a new run', () => {
  const research = { ...newFlow('research', 0), mainTokens: 40_000, stageTokens: { research: 40_000 }, isWorking: false }

  expect(startsNewFlow(research, 'spec', undefined)).toBe(false)
  expect(startsNewFlow(research, 'research', undefined)).toBe(false)

  const spec = startFlowSkill(research, 'spec', undefined, 5)
  const view = viewOf(spec, 10)

  expect(spec.entry).toBe('spec')
  expect(spec.visited).toEqual(['research', 'spec'])
  expect(spec.previousStage).toBe('research')
  expect(view.stages.map(stage => stage.status)).toEqual(['done', 'skipped', 'current', 'pending', 'pending', 'pending'])
  expect(view.totals.tokens).toBe(40_000)

  // The line lights from the run's first stop (Research, x 62) for the carried run, from Spec (x 284) alone.
  const lit = (source: string): string | undefined => /<rect x="(\d+)" y="\d+" width="\d+" height="4" fill="#D97757"/.exec(source)?.[1]

  expect(lit(bandSvg(view).source)).toBe('62')
  expect(lit(bandSvg(viewOf(newFlow('spec', 0), 10)).source)).toBe('284')
  expect(lit(bandSvg(viewOf(newFlow('develop', 0), 10)).source)).toBe('62')

  // Back to research after spec: a new question, so a new run.
  expect(startsNewFlow(spec, 'research', undefined)).toBe(true)
  expect(startFlowSkill(spec, 'research', undefined, 20).visited).toEqual(['research'])
})

test('the view is working, waiting or done, and shows no cost without a cost reading', () => {
  const review = enterStage(enterStage(newFlow('develop', 0), 'implement', 1), 'review', 2)

  expect(viewOf(review, 3000).mode).toBe('working')
  expect(viewOf({ ...review, isWorking: false }, 3000).mode).toBe('done')
  expect(viewOf({ ...review, isWorking: false }, 3000).stages.at(-1)?.status).toBe('done')

  const research = { ...enterStage(newFlow('research', 0), 'research', 1), isWorking: false }
  const view = viewOf(research, 61_000)

  expect(view.mode).toBe('waiting')
  expect(view.elapsedMs).toBe(61_000)
  expect(view.hasCost).toBe(false)
  expect(view.totals).toEqual({ tokens: 0, counts: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 } })
  expect(view.party).toEqual([{ id: 'main', label: 'main', running: false, tokens: 0 }])
})

test('tokens and costs format short', () => {
  expect(formatTokens(842)).toBe('842')
  expect(formatTokens(1500)).toBe('1.5k')
  expect(formatTokens(12_400)).toBe('12k')
  expect(formatTokens(1_300_000)).toBe('1.3M')
  expect(formatCost(0.1234)).toBe('$0.123')
  expect(formatCost(12.345)).toBe('$12.35')
})

test('a subagent run counts once, whether its Agent result or its own turn arrives first', () => {
  const spawned = {
    ...enterStage(newFlow('develop', 0), 'implement', 0),
    agents: [makeAgent({ toolUseId: 'use-1', agentId: 'agent-1', type: 'implementor', description: 'd', now: 0 })],
  }
  const result = { status: 'completed', totalTokens: 3500, usage: { input_tokens: 3000, output_tokens: 500 } }
  const turn = { agentId: 'agent-1', reason: 'answer', usage: { input_tokens: 3000, output_tokens: 500, model: 'claude-sonnet-5-5' } }

  const resultFirst = applyTurnComplete(applyAgentResult(spawned, 'use-1', result), turn)
  const turnFirst = applyAgentResult(applyTurnComplete(spawned, turn), 'use-1', result)

  for (const flow of [resultFirst, turnFirst]) {
    expect(flow.agents[0]?.tokens).toBe(3500)
    expect(flow.agents[0]?.counts).toEqual({ input: 3000, output: 500, cacheRead: 0, cacheWrite: 0 })
  }

  // A larger turn total wins over the result, and its counts are the ones shown.
  const larger = applyTurnComplete(resultFirst, { ...turn, usage: { input_tokens: 1000, output_tokens: 0 } })
  expect(larger.agents[0]?.tokens).toBe(4500)
  expect(larger.agents[0]?.counts).toEqual({ input: 4000, output: 500, cacheRead: 0, cacheWrite: 0 })
})

test('cache reads stay out of token totals and show as the cached total', () => {
  const usage = {
    input_tokens: 100,
    output_tokens: 2000,
    cache_read_input_tokens: 900_000,
    cache_creation_input_tokens: 30_000,
    model: 'claude-opus-5-5',
  }
  const spawned = {
    ...applyCost(enterStage(newFlow('develop', 0), 'implement', 0), 1),
    agents: [makeAgent({ toolUseId: 'use-1', agentId: 'agent-1', type: 'implementor', description: 'd', now: 0 })],
  }
  const flow = applyTurnComplete(applyTurnComplete(spawned, { agentId: 'agent-1', reason: 'answer', usage }), {
    reason: 'tool_use',
    usage,
  })

  expect(flow.mainTokens).toBe(32_100)
  expect(flow.mainCounts).toEqual({ input: 100, output: 2000, cacheRead: 900_000, cacheWrite: 30_000 })
  expect(flow.agents[0]?.tokens).toBe(32_100)

  const view = viewOf(flow, 1000)
  expect(view.totals.tokens).toBe(64_200)
  expect(view.totals.counts.cacheRead).toBe(1_800_000)
  expect(view.stages.find(stage => stage.stage === 'implement')?.spend?.tokens).toBe(64_200)

  const band = bandSvg(view)
  expect(band.source).toContain('64K<tspan fill="#7D766B" font-weight="400"> TOK</tspan>')
  expect(band.source).toContain('1.80M</tspan><tspan fill="#7D766B" font-weight="400"> CACHED')
  expect(band.alt).toContain('1.80M cached reads')

  const party = partySvg(view).source
  for (const head of ['INPUT', 'OUTPUT', 'TOTAL', 'CACHED', 'EST. COST']) expect(party).toContain(`>${head}</text>`)
  // Input includes cache writes: 100 + 30 000.
  expect(party).toContain('>30K</text>')
  expect(party).toContain('>900K</text>')
})

test('a flow that reached done takes no later main turns or cost; one that never does keeps crediting', () => {
  const usage = { input_tokens: 1000, output_tokens: 0, model: 'claude-opus-5-5' }
  const review = applyCost(enterStage(newFlow('develop', 0), 'review', 0), 1)
  const done = applyTurnComplete(review, { reason: 'answer', usage })

  expect(done.isEnded).toBe(true)
  expect(done.mainTokens).toBe(1000)
  expect(applyTurnComplete(done, { reason: 'answer', usage })).toBe(done)
  expect(applyCost(done, 3)).toBe(done)
  // A new develop replaces it; a nested skill reopens it and drops the stale cost baseline.
  expect(startsNewFlow(done, 'develop', undefined)).toBe(true)
  expect(startFlowSkill(done, 'develop', undefined, 5).isEnded).toBeUndefined()
  expect(startsNewFlow(done, 'implement', undefined)).toBe(false)
  const reopened = startFlowSkill(done, 'implement', undefined, 5)
  expect([reopened.entry, reopened.stage, reopened.isEnded, reopened.costLast]).toEqual(['develop', 'implement', undefined, undefined])
  expect(applyCost(applyCost(reopened, 10), 10.5).costTotal).toBe(0.5)

  const research = applyTurnComplete(newFlow('research', 0), { reason: 'answer', usage })
  expect(research.isEnded).toBeUndefined()
  expect(applyTurnComplete(research, { reason: 'answer', usage }).mainTokens).toBe(2000)
  expect(applyCost(applyCost(research, 1), 2).costTotal).toBe(1)
})

test('a delivered spec ends an implementation run, not a research, innovate or spec run', () => {
  const spec = parseSpec('.ai/worklog/x/spec_parser.md', SPEC.replace('## AGENT LOG\n', '## AGENT LOG\n- P2 SUCCESS (revision 2)\n'))
  expect(spec?.phases.every(phase => phase.status === 'success')).toBe(true)

  for (const skill of ['research', 'innovate', 'spec']) {
    const flow = applyTurnComplete({ ...newFlow(skill, 0), spec: spec! }, { reason: 'answer' })
    expect(flow.isEnded, skill).toBeUndefined()
    expect(viewOf(flow, 1).mode, skill).toBe('waiting')
  }

  const implement = applyTurnComplete({ ...newFlow('implement', 0), spec: spec! }, { reason: 'answer' })
  expect(implement.isEnded).toBe(true)
})

test('agents saved by an older version without a stage still count toward their stage', () => {
  const flow = enterStage(newFlow('develop', 0), 'implement', 0)
  const agent = { ...makeAgent({ toolUseId: 'use-1', type: 'implementor', description: 'd', now: 0 }), tokens: 5000 }
  delete (agent as { stage?: string }).stage

  const view = viewOf({ ...flow, agents: [agent] }, 1)
  expect(view.stages.find(stage => stage.stage === 'implement')?.spend?.tokens).toBe(5000)
  expect(view.agents[0]?.stage).toBe('implement')
})

test('a running phase with no task list sweeps its bar, and the band shows the spec progress', () => {
  const SWEEP = 'keyTimes="0;.05;.2;1"'
  const worker = makeAgent({ toolUseId: 'u2', agentId: 'a2', type: 'implementor', description: 'Implement P2', phaseId: 'P2', now: 0 })
  const flow = { ...newFlow('implement', 0), spec: parseSpec('spec_parser.md', SPEC)!, agents: [worker] }
  const view = viewOf(flow, 10)

  expect(view.phase?.id).toBe('P2')
  expect(phasesSvg(view)?.source).toContain(SWEEP)
  // P1 of 2 is done: 50%, not 0%.
  expect(bandSvg(view).source).toContain('>50%</text>')

  const withTasks = { ...flow, agents: [{ ...worker, tasks: [{ id: 't', subject: 'Write tests', status: 'in_progress' as const }] }] }

  expect(phasesSvg(viewOf(withTasks, 10))?.source).not.toContain(SWEEP)
})
