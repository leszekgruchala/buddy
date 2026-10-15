// Stages and the view model the skins draw.

import type { BuddyAgent, BuddyCounts, BuddyFlow, BuddyStage, BuddyTask } from '../types'

import { fillFlow, isFinished, OPTIONAL_STAGES, phaseViews, progressOf, skillLabel, STAGE_LABEL, STAGES } from './model'
import type { PhaseView, Progress } from './model'
import { estimateCost, mergeCounts } from './usage'

const STAGE_VERB: Record<BuddyStage, string> = {
  research: 'Researching',
  innovate: 'Exploring alternatives',
  spec: 'Writing the spec',
  implement: 'Implementing',
  validate: 'Validating',
  review: 'Reviewing the change',
}

export type Focus = {
  headline: string
  phase?: PhaseView
  phases: PhaseView[]
  overall?: Progress
  bar?: Progress
  barLabel?: string
  activity?: string
  activityBy?: string
  /** When the running subagent behind the activity started. */
  activityStartedAt?: number
}

/** Picks what the band shows: the stage, the phase in work, and its progress. */
export function focusOf(flow: BuddyFlow): Focus {
  const phases = phaseViews(flow)
  const phase =
    phases.find(view => view.status === 'running') ??
    (flow.stage === 'implement' ? phases.find(view => view.status === 'pending') : undefined)
  const settled = phases.filter(view => view.status === 'success').length
  const overall =
    phases.length === 0
      ? undefined
      : {
          done: settled,
          total: phases.length,
          fraction: Math.min(1, (settled + (phase?.progress?.fraction ?? 0)) / phases.length),
        }
  const runningAgents = flow.agents.filter(agent => agent.status === 'running')
  const actor = phase?.agent?.status === 'running' ? phase.agent : runningAgents.at(-1)
  const headline = flow.stage ? STAGE_VERB[flow.stage] : skillLabel(flow.skill)
  const direct = phases.length === 0 && flow.tasks.length > 0 ? progressOf(flow.tasks) : undefined
  const bar = phase?.progress ?? direct
  const result: Focus = { headline, phases }

  if (phase) result.phase = phase
  if (overall) result.overall = overall
  if (bar) {
    result.bar = bar
    result.barLabel = `${bar.done}/${bar.total} tasks`
  }
  if (actor?.activity) {
    result.activity = actor.activity
    result.activityBy = actor.type
    if (actor.status === 'running') result.activityStartedAt = actor.startedAt
  } else if (flow.activity) {
    result.activity = flow.activity
  }

  return result
}

export type StageStatus = 'pending' | 'current' | 'done' | 'skipped'
export type ViewMode = 'working' | 'waiting' | 'done'
/** `tokens` counts new tokens: input, output and cache writes, never cache reads. */
export type Spend = { tokens: number; cost?: number }

/** The flow's spend, with the token counts of every loop summed; `counts.cacheRead` is the cached total. */
export type Totals = Spend & { counts: BuddyCounts }

const NO_COUNTS: BuddyCounts = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export type StageView = {
  stage: BuddyStage
  label: string
  optional: boolean
  status: StageStatus
  spend?: Spend
}

export type PhaseSpendView = PhaseView & { spend?: Spend }

export type AgentView = {
  id: string
  label: string
  type: string
  description: string
  phase?: string
  stage?: BuddyStage
  status: BuddyAgent['status']
  running: boolean
  model?: string
  tokens: number
  /** The counts behind `tokens`; absent when the run reported only a total. */
  counts?: BuddyCounts
  cost?: number
  activity?: string
  startedAt: number
}

export type PartyView = {
  id: string
  label: string
  phase?: string
  running: boolean
  tokens: number
  counts?: BuddyCounts
  cost?: number
  model?: string
}

export type StageChange = {
  from?: BuddyStage
  to?: BuddyStage
  at: number
  /** Skipped stops strictly between `from` and `to`, in track order. */
  hops: BuddyStage[]
}

export type BuddyView = {
  entry: string
  entryLabel: string
  headline: string
  mode: ViewMode
  title?: string
  startedAt: number
  elapsedMs: number
  stage?: BuddyStage
  stages: StageView[]
  skipped: BuddyStage[]
  phase?: PhaseSpendView
  phases: PhaseSpendView[]
  overall?: Progress
  bar?: Progress
  barLabel?: string
  tasks: BuddyTask[]
  party: PartyView[]
  agents: AgentView[]
  totals: Totals
  hasCost: boolean
  activity?: string
  actor?: string
  /** When the acting loop is a running subagent: when it started. */
  actorStartedAt?: number
  change: StageChange
}

/**
 * Optional stops that have not run, once a later stage has started. A `develop` run covers the
 * track from its first stop; another run covers it from the first stage it ran.
 */
export function skippedStages(flow: BuddyFlow): BuddyStage[] {
  const reached = flow.visited.map(stage => STAGES.indexOf(stage))

  if (reached.length === 0) {
    return []
  }

  const first = flow.entry === 'develop' ? 0 : Math.min(...reached)
  const last = Math.max(...reached)

  return STAGES.filter(
    (stage, index) => OPTIONAL_STAGES.includes(stage) && index >= first && index < last && !flow.visited.includes(stage),
  )
}

function spendOf(tokens: number, cost: number | undefined): Spend | undefined {
  return tokens > 0 || (cost !== undefined && cost > 0)
    ? { tokens, ...(cost === undefined ? {} : { cost }) }
    : undefined
}

/**
 * Derives everything a skin draws from the flow; skins never read raw events.
 * @param source the flow in state
 * @param now the clock, in milliseconds
 */
export function viewOf(source: BuddyFlow, now: number): BuddyView {
  const flow = fillFlow(source)
  const focus = focusOf(flow)
  const hasCost = flow.costLast !== undefined
  const isRunning = (agent: BuddyAgent): boolean => agent.status === 'running'
  const skipped = skippedStages(flow)
  // An ended flow stays CLEARED wherever it ended (a paused develop run ends at the stage it paused in).
  const mode: ViewMode = flow.isWorking
    ? 'working'
    : flow.isEnded === true || isFinished(flow, focus.phases)
      ? 'done'
      : 'waiting'

  const stages = STAGES.map((stage): StageView => {
    const agentTokens = flow.agents.filter(agent => agent.stage === stage).reduce((sum, agent) => sum + agent.tokens, 0)
    const spend = spendOf((flow.stageTokens[stage] ?? 0) + agentTokens, hasCost ? flow.stageCost[stage] : undefined)
    const status: StageStatus = skipped.includes(stage)
      ? 'skipped'
      : stage === flow.stage
        ? mode === 'done'
          ? 'done'
          : 'current'
        : flow.visited.includes(stage)
          ? 'done'
          : 'pending'

    return {
      stage,
      label: STAGE_LABEL[stage],
      optional: OPTIONAL_STAGES.includes(stage),
      status,
      ...(spend ? { spend } : {}),
    }
  })

  const withSpend = (view: PhaseView): PhaseSpendView => {
    const tokens = flow.agents.filter(agent => agent.phaseId === view.id).reduce((sum, agent) => sum + agent.tokens, 0)
    const spend = spendOf(tokens, hasCost ? flow.phaseCost[view.id] : undefined)

    return spend ? { ...view, spend } : view
  }

  const phases = focus.phases.map(withSpend)
  const phase = focus.phase ? phases.find(view => view.id === focus.phase?.id) : undefined
  const agents = flow.agents.map((agent): AgentView => {
    const cost = hasCost ? estimateCost(agent.model, agent.counts) : undefined

    return {
      id: agent.toolUseId,
      label: agent.type,
      type: agent.type,
      description: agent.description,
      status: agent.status,
      running: isRunning(agent),
      tokens: agent.tokens,
      startedAt: agent.startedAt,
      ...(agent.phaseId === undefined ? {} : { phase: agent.phaseId }),
      ...(agent.stage === undefined ? {} : { stage: agent.stage }),
      ...(agent.model === undefined ? {} : { model: agent.model }),
      ...(agent.counts === undefined ? {} : { counts: agent.counts }),
      ...(cost === undefined ? {} : { cost }),
      ...(agent.activity === undefined ? {} : { activity: agent.activity }),
    }
  })

  const mainCost = hasCost ? flow.mainCost : undefined
  const party: PartyView[] = [
    ...agents
      .filter(agent => agent.stage !== undefined && agent.stage === flow.stage)
      .map(
        (agent): PartyView => ({
          id: agent.id,
          label: agent.label,
          running: agent.running,
          tokens: agent.tokens,
          ...(agent.phase === undefined ? {} : { phase: agent.phase }),
          ...(agent.counts === undefined ? {} : { counts: agent.counts }),
          ...(agent.cost === undefined ? {} : { cost: agent.cost }),
          ...(agent.model === undefined ? {} : { model: agent.model }),
        }),
      ),
    {
      id: 'main',
      label: 'main',
      running: flow.isWorking && !flow.agents.some(isRunning),
      tokens: flow.mainTokens,
      ...(flow.mainCounts === undefined ? {} : { counts: flow.mainCounts }),
      ...(mainCost === undefined ? {} : { cost: mainCost }),
      ...(flow.mainModel === undefined ? {} : { model: flow.mainModel }),
    },
  ]

  const totalTokens = flow.mainTokens + flow.agents.reduce((sum, agent) => sum + agent.tokens, 0)
  const totalCounts = [flow.mainCounts, ...flow.agents.map(agent => agent.counts)].reduce<BuddyCounts>(
    (sum, counts) => (counts === undefined ? sum : mergeCounts(sum, counts)),
    NO_COUNTS,
  )
  const totalCost = hasCost ? (flow.costTotal ?? 0) : undefined
  const from = flow.previousStage === undefined ? -1 : STAGES.indexOf(flow.previousStage)
  const to = flow.stage === undefined ? -1 : STAGES.indexOf(flow.stage)
  const hops =
    from === -1 || to === -1
      ? []
      : STAGES.filter((stage, index) => index > Math.min(from, to) && index < Math.max(from, to) && skipped.includes(stage))

  return {
    entry: flow.entry,
    entryLabel: skillLabel(flow.entry),
    headline: mode === 'waiting' && flow.stage ? `${STAGE_LABEL[flow.stage]} ready · your turn` : focus.headline,
    mode,
    startedAt: flow.startedAt,
    elapsedMs: Math.max(0, now - flow.startedAt),
    stages,
    skipped,
    phases,
    tasks: flow.tasks,
    party,
    agents,
    totals: { tokens: totalTokens, counts: totalCounts, ...(totalCost === undefined ? {} : { cost: totalCost }) },
    hasCost,
    change: {
      at: flow.stageChangedAt,
      hops,
      ...(flow.previousStage === undefined ? {} : { from: flow.previousStage }),
      ...(flow.stage === undefined ? {} : { to: flow.stage }),
    },
    ...(flow.stage === undefined ? {} : { stage: flow.stage }),
    ...(flow.spec ? { title: flow.spec.title } : {}),
    ...(phase ? { phase } : {}),
    ...(focus.overall ? { overall: focus.overall } : {}),
    ...(focus.bar ? { bar: focus.bar, barLabel: focus.barLabel ?? '' } : {}),
    ...(focus.activity ? { activity: focus.activity } : {}),
    ...(focus.activityBy ? { actor: focus.activityBy } : {}),
    ...(focus.activityStartedAt === undefined ? {} : { actorStartedAt: focus.activityStartedAt }),
  }
}

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)

  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
    : `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export function textBar(fraction: number, width: number): string {
  const filled = Math.round(Math.max(0, Math.min(1, fraction)) * width)

  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Formats a token count the short way: `842`, `12.4k`, `1.3M`. */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return String(tokens)
  }

  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }

  return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`
}

/** Formats a cost in USD with enough digits for small amounts. */
export const formatCost = (usd: number): string => `$${usd.toFixed(usd < 1 ? 3 : 2)}`
