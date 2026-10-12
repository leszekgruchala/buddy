import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BuddyFlow, BuddyTask, BuddyTaskStatus } from '../types'

import { bandSvg, partySvg, phasesSvg } from './art'
import { cardLine, graphicBand, graphicPane, paneLine, plainBand, plainPane } from './draw'
import type { Actions } from './draw'
import {
  activityOf,
  agentStage,
  applyTaskCreate,
  applyTaskUpdate,
  applyTodoWrite,
  buddyAgent,
  buddySkill,
  enterStage,
  isSpecPath,
  makeAgent,
  newFlow,
  parseSpec,
  phaseIdIn,
  refreshSpec,
  reopenFlow,
  runningPhaseId,
  skillStage,
  startFlowSkill,
  startsNewFlow,
} from './model'
import { applyAgentResult, applyCost, applyTurnComplete, withShownCost } from './usage'
import type { AgentResultInput } from './usage'
import { viewOf } from './view'

const PANE = 'buddy-mod'
const flowAtom = atom({ plugin: 'buddy', key: 'flow' } as const, null)
/** The flow as the Desktop cards last drew it; see `publish`. */
const shownAtom = atom({ plugin: 'buddy', key: 'shown' } as const, null)
const hiddenAtom = atom({ plugin: 'buddy', key: 'isHidden' } as const, false)
const tickAtom = atom({ plugin: 'buddy', key: 'tick' } as const, 0)
/** True while a main turn runs; an atom, so the timers keep their gate across a hot reload. */
const turnAtom = atom({ plugin: 'buddy', key: 'isTurnRunning' } as const, false)

type Engine = EngineInterface

/** Applies `change` to the flow and writes only when the result differs from what stands. */
async function changeFlow(
  $: Engine,
  change: (flow: BuddyFlow) => BuddyFlow | null,
): Promise<void> {
  const flow = await read($, flowAtom)

  if (flow === null) {
    return
  }

  const next = change(flow)

  if (next !== flow && JSON.stringify(next) !== JSON.stringify(flow)) {
    await update($, flowAtom, current => (current ? change(current) : current))
  }

  schedulePublish($)
}

/**
 * Changes this close together reach the Desktop cards as one redraw: a subagent ends with
 * several (its usage, its result), each of which would blank the cards.
 */
const SETTLE_MS = 500

let pendingPublish: { cancel: () => unknown } | undefined

function schedulePublish($: Engine): void {
  if (pendingPublish !== undefined) {
    return
  }

  pendingPublish = $.clock.after(SETTLE_MS, async () => {
    pendingPublish = undefined
    await publish($)
  })
}

/**
 * Publishes at once. Desktop redraws the band itself when a main turn starts or ends; a publish at
 * the same moment shares that redraw instead of blanking the cards again a moment later.
 */
async function publishNow($: Engine): Promise<void> {
  pendingPublish?.cancel()
  pendingPublish = undefined
  await publish($)
}

/** How long the cost on the Desktop cards stays as it is while a turn runs. */
const COST_SHOW_MS = 60_000

let costShownAt = 0

/** Everything the Desktop cards draw of `flow`, at rest, as one string: equal strings draw equal cards. */
function drawnKey(flow: BuddyFlow | null, now: number): string {
  if (flow === null) {
    return 'null'
  }

  const view = viewOf(flow, now)

  return [
    bandSvg(view).source,
    bandSvg(view, {}, true).source,
    phasesSvg(view)?.source ?? '',
    partySvg(view).source,
    cardLine(view),
    paneLine(view) ?? '',
  ].join('\n')
}

/**
 * Copies the flow to the snapshot that the Desktop cards draw. Desktop rebuilds every mod site on
 * any state write (see AGENTS.md), so the snapshot changes only when the cards would draw something
 * new: never for tool activity, and for cost at most once each `COST_SHOW_MS` while a turn runs.
 */
async function publish($: Engine): Promise<void> {
  const flow = await read($, flowAtom)
  const shown = await read($, shownAtom)
  const now = await $.clock.now()
  const isCostDue = now - costShownAt >= COST_SHOW_MS || !(await read($, turnAtom))
  const next = isCostDue ? flow : withShownCost(flow, shown)

  if (drawnKey(next, now) === drawnKey(shown, now)) {
    return
  }

  if (isCostDue) costShownAt = now
  await update($, shownAtom, () => next)
}

/** Writes the flow, then publishes it to the Desktop cards. */
async function setFlow($: Engine, change: (flow: BuddyFlow | null) => BuddyFlow | null): Promise<void> {
  await update($, flowAtom, change)
  schedulePublish($)
}

/** Applies `change` to the task list of the loop that made the call. */
function withTasks(
  flow: BuddyFlow,
  agentId: string | undefined,
  change: (tasks: BuddyTask[]) => BuddyTask[],
): BuddyFlow {
  if (agentId === undefined) {
    return { ...flow, tasks: change(flow.tasks) }
  }

  return {
    ...flow,
    agents: flow.agents.map(agent =>
      agent.agentId === agentId ? { ...agent, tasks: change(agent.tasks) } : agent,
    ),
  }
}

/** The phase a new task of the main loop belongs to; a subagent's tasks have their own list. */
const mainPhase = (flow: BuddyFlow, agentId: string | undefined): string | undefined =>
  agentId === undefined ? runningPhaseId(flow) : undefined

/** True when a call of this loop belongs to the flow: a subagent of it, or the main loop while the flow has not ended. */
function isTracked(flow: BuddyFlow, agentId: string | undefined): boolean {
  return agentId === undefined ? flow.isEnded !== true : flow.agents.some(agent => agent.agentId === agentId)
}

let lastStart = { skill: '', at: 0 }

/** Writes the turn gate only when it changes. */
async function setTurnRunning($: Engine, isRunning: boolean): Promise<void> {
  if ((await read($, turnAtom)) !== isRunning) {
    await update($, turnAtom, () => isRunning)
  }
}

/** True while a main turn runs for a flow that has not reached done: the tick and the cost poll run only then. */
async function isLive($: Engine): Promise<boolean> {
  if (!(await read($, turnAtom))) {
    return false
  }

  const flow = await read($, flowAtom)

  return flow !== null && flow.isEnded !== true
}

let hasTimers = false

/**
 * Starts the elapsed tick and the cost poll. A hot reload cancels them and resets module memory, and
 * a turn or tool hook can reach the new module before its `session.start`, so every entry point
 * starts them through `ensureTimers`, only when none run.
 */
function startTimers($: Engine): void {
  hasTimers = true
  $.clock.every(1000, async () => {
    if (await isLive($)) {
      await update($, tickAtom, tick => tick + 1)
    }
  })
  $.clock.every(COST_POLL_MS, async () => {
    if (await isLive($)) {
      await pollCost($)
    }
  })
}

function ensureTimers($: Engine): void {
  if (!hasTimers) {
    startTimers($)
  }
}

/** How often the session cost is read while a main turn runs. */
const COST_POLL_MS = 3000

/**
 * Reads the session cost and credits its growth to the current stage and phase.
 * Free to call; it never throws, and writes only when the figure changed.
 */
async function pollCost($: Engine): Promise<void> {
  try {
    const usd = (await $.session.usage()).cost?.usd

    if (usd !== undefined) {
      await changeFlow($, flow => applyCost(flow, usd))
    }
  } catch {
    // Cost is a display only.
  }
}

async function startSkill($: Engine, skill: string, agentId: string | undefined): Promise<void> {
  const now = await $.clock.now()

  if (lastStart.skill === skill && now - lastStart.at < 5000) {
    return
  }

  lastStart = { skill, at: now }
  // Cost so far belongs to the stage the flow is leaving.
  await pollCost($)

  if (startsNewFlow(await read($, flowAtom), skill, agentId)) {
    await update($, hiddenAtom, () => false)
  }

  const isTurnRunning = await read($, turnAtom)
  await setFlow($, flow => startFlowSkill(flow, skill, agentId, now, isTurnRunning))
  await pollCost($)
}

/** Re-reads the spec file of an ended or pausing flow, so later AGENT LOG results still show. */
async function refreshOwnSpec($: Engine, path: string): Promise<void> {
  const spec = parseSpec(path, await $.fs.read(path))

  if (spec !== undefined) {
    await changeFlow($, flow => refreshSpec(flow, spec))
  }
}

async function loadSpec($: Engine, path: string, isAuthoring: boolean): Promise<void> {
  const text = await $.fs.read(path)
  const spec = parseSpec(path, text)

  if (spec === undefined) {
    return
  }

  const now = await $.clock.now()
  await changeFlow($, flow => {
    const isEarly = flow.stage === undefined || ['research', 'innovate'].includes(flow.stage)

    return { ...(isAuthoring && isEarly ? enterStage(flow, 'spec', now) : flow), spec }
  })
}

function actionsFor($: Engine): Actions {
  return {
    hide: () => update($, hiddenAtom, () => true),
    details: () => $.ui.open({ id: PANE, title: 'Buddy' }),
    reset: async () => {
      await setFlow($, () => null)
      await $.ui.close({ id: PANE })
    },
  }
}

export const register: Register = (on, options) => {
  // The user turned off the mod in the plugin options: register no hooks, so Buddy's skills, agents and hooks run alone.
  if (options.show_mod === false) return

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'buddy-mod',
      description: 'Show or hide the Buddy workflow progress pane',
    })
    ensureTimers($)

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      lastStart = { skill: '', at: 0 }
      await setFlow($, () => null)
    }

    return next(e)
  })

  // `/buddy-mod` toggles the pane and answers with no text and no context, so the model reads nothing.
  on('command.run', { command: 'buddy-mod' }, async $ => {
    const isOpen = (await $.ui.panes()).some(pane => pane.id === PANE)

    if (isOpen) {
      await $.ui.close({ id: PANE })

      return {}
    }

    await update($, hiddenAtom, () => false)
    await $.ui.open({ id: PANE, title: 'Buddy' })

    return {}
  })

  // A typed `/buddy:<skill>` arrives as a command; the model's own choice arrives as a Skill call.
  on('command.run', async ($, e, next) => {
    const skill = buddySkill(e.command)

    if (skill !== undefined) {
      await startSkill($, skill, undefined).catch(() => undefined)
    }

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    const skill = buddySkill(e.skill)

    if (skill !== undefined) {
      await startSkill($, skill, undefined).catch(() => undefined)
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    ensureTimers($)
    await setTurnRunning($, true).catch(() => undefined)
    await changeFlow($, flow => (flow.isEnded === true ? flow : { ...flow, isWorking: true })).catch(() => undefined)
    await publishNow($).catch(() => undefined)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const agentId = e.agentId

    if (agentId === undefined) {
      await setTurnRunning($, false).catch(() => undefined)
      await pollCost($)
    }

    await changeFlow($, flow =>
      applyTurnComplete(flow, {
        reason: e.reason,
        ...(agentId === undefined ? {} : { agentId }),
        ...(e.usage === undefined ? {} : { usage: e.usage }),
      }),
    ).catch(() => undefined)

    if (agentId === undefined) {
      await publishNow($).catch(() => undefined)
    }

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e)
    const type = buddyAgent(e.subagentType)

    if (type === undefined || ran.deny !== undefined) {
      return ran
    }

    try {
      const now = await $.clock.now()
      const phaseId =
        phaseIdIn(e.description) ??
        /\bid:\s*(P\d+[a-z]?)\b/.exec(e.prompt)?.[1] ??
        (type === 'implementor' ? phaseIdIn(e.prompt.slice(0, 600)) : undefined)
      const agent = makeAgent({
        toolUseId: e.tool_use_id,
        type,
        description: e.description,
        now,
        ...(ran.agentId === undefined ? {} : { agentId: ran.agentId }),
        ...(phaseId === undefined ? {} : { phaseId }),
      })

      await pollCost($)

      const before = await read($, flowAtom)
      const parent = e.parentAgentId

      // A spawn by a subagent outside the flow never takes an ended or pausing flow back.
      if (
        before !== null &&
        (before.isEnded === true || before.isPendingEnd === true) &&
        parent !== undefined &&
        !before.agents.some(one => one.agentId === parent)
      ) {
        return ran
      }

      if (before === null) {
        await update($, hiddenAtom, () => false)
      }

      const isTurnRunning = await read($, turnAtom)

      await setFlow($, flow => {
        // A Buddy subagent is a nested stage start: it reopens a flow that had ended.
        const base = flow !== null ? reopenFlow(flow, isTurnRunning) : newFlow(type === 'developer' ? 'develop' : type, now)
        const moved = enterStage(base, agentStage(type), now)

        return { ...moved, agents: [...moved.agents.filter(one => one.toolUseId !== e.tool_use_id), agent] }
      })
      await pollCost($)
    } catch {
      // The display must never change what the spawn answered.
    }

    return ran
  })

  on('tool.call', async ($, e, next) => {
    ensureTimers($)
    const input = e as unknown as Record<string, unknown>
    const agentId = e.agentId

    try {
      if (e.tool === 'Skill') {
        const skill = buddySkill(String(input.skill ?? ''))

        if (skill !== undefined) {
          await startSkill($, skill, agentId)
        }
      }

      const activity = activityOf(String(e.tool), input)

      if (activity !== undefined) {
        await changeFlow($, flow => {
          if (!isTracked(flow, agentId)) {
            return flow
          }

          return agentId === undefined
            ? { ...flow, activity, toolCount: flow.toolCount + 1 }
            : {
                ...flow,
                toolCount: flow.toolCount + 1,
                agents: flow.agents.map(agent => (agent.agentId === agentId ? { ...agent, activity } : agent)),
              }
        })
      }

      if (e.tool === 'TodoWrite') {
        const todos = e.todos
        await changeFlow($, flow =>
          isTracked(flow, agentId)
            ? withTasks(flow, agentId, tasks => applyTodoWrite(todos, tasks, mainPhase(flow, agentId)))
            : flow,
        )
      }

      if (e.tool === 'TaskUpdate') {
        const change: { status?: BuddyTaskStatus | 'deleted'; subject?: string } = {}

        if (e.status !== undefined) change.status = e.status
        if (e.subject !== undefined) change.subject = e.subject

        await changeFlow($, flow =>
          isTracked(flow, agentId) ? withTasks(flow, agentId, tasks => applyTaskUpdate(tasks, e.taskId, change)) : flow,
        )
      }
    } catch {
      // Progress tracking is best effort; the call itself always goes on.
    }

    const ran = await next(e)

    try {
      if (e.tool === 'TaskCreate' && ran.deny === undefined && ran.isError !== true) {
        const created = (ran.result as { task?: { id?: string; subject?: string } } | undefined)?.task

        if (created?.id !== undefined) {
          const id = created.id
          const subject = created.subject ?? e.subject
          await changeFlow($, flow =>
            isTracked(flow, agentId)
              ? withTasks(flow, agentId, tasks => applyTaskCreate(tasks, id, subject, mainPhase(flow, agentId)))
              : flow,
          )
        }
      }

      if (e.tool === 'Agent' && e.tool_use_id !== undefined) {
        const id = e.tool_use_id
        const result = ran.result as AgentResultInput | undefined
        const isFailed = ran.deny !== undefined || ran.isError === true

        await changeFlow($, flow =>
          isFailed
            ? {
                ...flow,
                agents: flow.agents.map(agent => (agent.toolUseId === id ? { ...agent, status: 'failed' as const } : agent)),
              }
            : applyAgentResult(flow, id, result),
        )
      }

      if ((e.tool === 'Write' || e.tool === 'Edit' || e.tool === 'Read') && isSpecPath(e.file_path)) {
        const flow = await read($, flowAtom)

        if (flow !== null && ran.deny === undefined && ran.isError !== true) {
          const isSettled = flow.isEnded === true || flow.isPendingEnd === true

          if (isSettled && flow.spec?.path === e.file_path) {
            await refreshOwnSpec($, e.file_path)
          } else if (isTracked(flow, agentId)) {
            await loadSpec($, e.file_path, e.tool !== 'Read')
          }
        }
      }
    } catch {
      // Same as above: never fail the tool call for the display.
    }

    return ran
  })


  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const isText = e.surface === 'terminal'
    const flow = isText ? await read($, flowAtom) : await read($, shownAtom)

    if (e.props.hasSurvey || flow === null || (await read($, hiddenAtom))) {
      return next(e)
    }

    // Text redraws cheaply, so the terminal follows each tool call and the elapsed time each second.
    if (isText) await read($, tickAtom)
    const now = await $.clock.now()
    // A finished flow stays CLEARED while later, unrelated turns run.
    const view = viewOf({ ...flow, isWorking: flow.isEnded !== true && (flow.isWorking || e.props.isWorking) }, now)

    if (isText) {
      return plainBand($.ui.resolve(e), actionsFor($), view)
    }

    return graphicBand($.ui.resolve(e), actionsFor($), view, now)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const isText = e.surface === 'terminal'
    const flow = isText ? await read($, flowAtom) : await read($, shownAtom)
    if (isText) await read($, tickAtom)
    const now = await $.clock.now()

    if (flow === null) {
      const { Text } = $.ui.resolve(e)

      return (
        <Text key="empty" dimColor>
          No Buddy workflow yet. Start one with /buddy:develop or any Buddy skill.
        </Text>
      )
    }

    const view = viewOf(flow, now)

    if (isText) {
      return plainPane($.ui.resolve(e), actionsFor($), view)
    }

    return graphicPane($.ui.resolve(e), actionsFor($), view, now)
  })
}
