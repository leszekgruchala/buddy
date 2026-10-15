// Usage: tokens by loop, stage and phase; cost from the session poll and a price table.

import type { BuddyAgent, BuddyCounts, BuddyFlow } from '../types'

import { endIfFinished, fillFlow, phaseViews, restoreSnapshot } from './model'

/** USD per million tokens. API list prices; on a subscription the figure is an API-equivalent estimate. */
type Price = { input: number; output: number; cacheRead: number }

const PRICES: readonly { model: RegExp; price: Price }[] = [
  { model: /opus-5[-.]5/, price: { input: 4, output: 20, cacheRead: 0.2 } },
  { model: /sonnet-5[-.]5/, price: { input: 2, output: 10, cacheRead: 0.2 } },
  { model: /haiku-5[-.]5/, price: { input: 0.1, output: 0.5, cacheRead: 0.01 } },
  { model: /fable-5[-.]1/, price: { input: 10, output: 50, cacheRead: 0.25 } },
]

/** A cache write costs 1.25 times the input price (5-minute TTL; the usage does not say which TTL). */
const CACHE_WRITE_FACTOR = 1.25

export const sumCounts = (counts: BuddyCounts): number =>
  counts.input + counts.output + counts.cacheRead + counts.cacheWrite

/**
 * Tokens a loop added: input, output and cache writes. Cache reads are left out: each request reads
 * the whole cached context again, so their sum grows with the number of requests, not with the work.
 */
export const newTokens = (counts: BuddyCounts): number => counts.input + counts.output + counts.cacheWrite

export type TurnUsageInput = {
  input_tokens?: number | null
  output_tokens?: number | null
  cache_read_input_tokens?: number | null
  cache_creation_input_tokens?: number | null
  model?: string
}

/** Reads the four token counts of a `turn.complete` usage or an `Agent` result usage. */
export function countsOf(usage: TurnUsageInput): BuddyCounts {
  return {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
  }
}

/**
 * Estimates the cost of a loop from its token counts.
 * @returns USD, or `undefined` for a model the price table does not know
 */
export function estimateCost(model: string | undefined, counts: BuddyCounts | undefined): number | undefined {
  const price = model === undefined ? undefined : PRICES.find(entry => entry.model.test(model))?.price

  if (price === undefined || counts === undefined) {
    return undefined
  }

  return (
    (counts.input * price.input +
      counts.output * price.output +
      counts.cacheRead * price.cacheRead +
      counts.cacheWrite * price.input * CACHE_WRITE_FACTOR) /
    1_000_000
  )
}

/**
 * Sets an agent's tokens from the two totals of its one run, its own turns and the Agent result:
 * the larger stands, with the counts behind it. The two are never added together.
 * An Agent result without counts cannot be split, so its total stands as it is.
 */
function settleTokens(agent: BuddyAgent): BuddyAgent {
  const turnTotal = agent.turnCounts === undefined ? 0 : sumCounts(agent.turnCounts)
  const resultTotal = agent.resultTokens ?? 0

  if (turnTotal === 0 && resultTotal === 0) {
    return agent
  }

  const isResult = resultTotal > turnTotal
  const source = isResult ? agent.resultCounts : agent.turnCounts
  const counts = source ?? agent.counts

  return {
    ...agent,
    tokens: source === undefined ? Math.max(turnTotal, resultTotal) : newTokens(source),
    ...(counts === undefined ? {} : { counts }),
  }
}

export function mergeCounts(a: BuddyCounts | undefined, b: BuddyCounts): BuddyCounts {
  return a === undefined
    ? b
    : {
        input: a.input + b.input,
        output: a.output + b.output,
        cacheRead: a.cacheRead + b.cacheRead,
        cacheWrite: a.cacheWrite + b.cacheWrite,
      }
}

/**
 * Applies the end of a turn: the main loop goes idle, a subagent finishes, and the turn's tokens are credited.
 * Main-loop tokens go to the stage current now; a subagent keeps its own tokens, counted for its stage and phase.
 */
export function applyTurnComplete(
  flow: BuddyFlow,
  turn: { agentId?: string; reason: string; usage?: TurnUsageInput },
): BuddyFlow {
  const current = fillFlow(flow)
  const counts = turn.usage === undefined ? undefined : countsOf(turn.usage)
  const tokens = counts === undefined ? 0 : newTokens(counts)
  const model = turn.usage?.model

  if (turn.agentId === undefined) {
    // After the flow reached done, later main turns belong to other work.
    if (current.isEnded === true) {
      return current.isWorking ? { ...current, isWorking: false } : flow
    }

    // The turn after a paused develop run started no Buddy work: it is not this flow's turn, and the flow ends.
    if (current.isPendingEnd === true) {
      const ended = restoreSnapshot({ ...current, isWorking: false, isEnded: true })
      delete ended.isPendingEnd
      delete ended.heldCost
      delete ended.pendingSnapshot

      return ended
    }

    const estimate = estimateCost(model, counts)
    const stage = current.stage
    const next: BuddyFlow = {
      ...current,
      isWorking: false,
      mainTokens: current.mainTokens + tokens,
      ...(counts === undefined ? {} : { mainCounts: mergeCounts(current.mainCounts, counts) }),
      ...(model === undefined ? {} : { mainModel: model }),
      ...(estimate === undefined ? {} : { mainCost: (current.mainCost ?? 0) + estimate }),
      ...(stage === undefined || tokens === 0
        ? {}
        : { stageTokens: { ...current.stageTokens, [stage]: (current.stageTokens[stage] ?? 0) + tokens } }),
    }

    return endIfFinished(next)
  }

  const next: BuddyFlow = {
    ...current,
    agents: current.agents.map(agent => {
      if (agent.agentId !== turn.agentId) {
        return agent
      }

      const turnCounts = counts === undefined ? agent.turnCounts : mergeCounts(agent.turnCounts, counts)

      return settleTokens({
        ...agent,
        status: agent.status === 'running' ? (turn.reason === 'answer' ? 'done' : 'failed') : agent.status,
        ...(turnCounts === undefined ? {} : { turnCounts }),
        ...(model === undefined ? {} : { model }),
      })
    }),
  }

  return endIfFinished(next)
}

/** Fields that the session cost poll changes. */
const COST_KEYS = ['costTotal', 'costLast', 'stageCost', 'phaseCost', 'heldCost'] as const

/**
 * Returns `flow` with the cost fields of `shown`, so a redraw for another change does not also show
 * the newest cost. A different run (another start time) keeps its own cost.
 * @param flow the flow in state
 * @param shown the flow the Desktop cards draw now
 */
export function withShownCost(flow: BuddyFlow | null, shown: BuddyFlow | null): BuddyFlow | null {
  if (flow === null || shown === null || flow.startedAt !== shown.startedAt) {
    return flow
  }

  const next: Record<string, unknown> = { ...flow }

  for (const key of COST_KEYS) {
    if (shown[key] === undefined) delete next[key]
    else next[key] = shown[key]
  }

  return next as BuddyFlow
}

export type AgentResultInput = {
  status?: string
  agentId?: string
  totalTokens?: number
  usage?: TurnUsageInput
  resolvedModel?: string
  modelsUsed?: string[]
}

/**
 * Applies the result of the `Agent` tool call that dispatched `toolUseId`.
 * The total of the result and the total of the loop's own turns describe the same run, so the larger one stands.
 */
export function applyAgentResult(flow: BuddyFlow, toolUseId: string, result: AgentResultInput | undefined): BuddyFlow {
  const current = fillFlow(flow)

  return endIfFinished({
    ...current,
    agents: current.agents.map(agent => {
      if (agent.toolUseId !== toolUseId) {
        return agent
      }

      const counts = result?.usage === undefined ? undefined : countsOf(result.usage)
      const total = Math.max(result?.totalTokens ?? 0, counts === undefined ? 0 : sumCounts(counts))
      const model = result?.resolvedModel ?? result?.modelsUsed?.at(-1)
      const isDone = result?.status === 'completed'

      return settleTokens({
        ...agent,
        ...(isDone && agent.status === 'running' ? { status: 'done' as const } : {}),
        ...(result?.agentId !== undefined && agent.agentId === undefined ? { agentId: result.agentId } : {}),
        ...(total > 0 ? { resultTokens: total, ...(counts === undefined ? {} : { resultCounts: counts }) } : {}),
        ...(model === undefined ? {} : { model }),
      })
    }),
  })
}

/**
 * Applies one reading of the session's cost (`$.session.usage().cost.usd`).
 * The first reading is the baseline. Each later rise is credited to the current stage and,
 * when exactly one phase is running, to that phase. A fall is ignored. A flow that reached done takes no more cost.
 * @returns the same flow object when nothing changed, so no write follows
 */
export function applyCost(flow: BuddyFlow, usd: number): BuddyFlow {
  if (flow.isEnded === true) {
    return flow
  }

  const current = fillFlow(flow)

  if (current.costLast === undefined) {
    return { ...current, costLast: usd, costTotal: current.costTotal ?? 0 }
  }

  if (usd === current.costLast) {
    return flow
  }

  const delta = usd - current.costLast

  if (delta <= 0) {
    return { ...current, costLast: usd }
  }

  // While a paused develop run waits for its next turn to decide, that turn's cost is held back.
  if (current.isPendingEnd === true) {
    return { ...current, costLast: usd, heldCost: (current.heldCost ?? 0) + delta }
  }

  const stage = current.stage
  const running = phaseViews(current).filter(view => view.status === 'running')
  const phase = running.length === 1 ? running[0]!.id : undefined

  return {
    ...current,
    costLast: usd,
    costTotal: (current.costTotal ?? 0) + delta,
    ...(stage === undefined ? {} : { stageCost: { ...current.stageCost, [stage]: (current.stageCost[stage] ?? 0) + delta } }),
    ...(phase === undefined ? {} : { phaseCost: { ...current.phaseCost, [phase]: (current.phaseCost[phase] ?? 0) + delta } }),
  }
}
