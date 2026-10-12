import type {
  BuddyAgent,
  BuddyFlow,
  BuddyFlowSnapshot,
  BuddyPhase,
  BuddyPhaseStatus,
  BuddySpec,
  BuddyStage,
  BuddyTask,
  BuddyTaskStatus,
} from '../types'

export const STAGES: readonly BuddyStage[] = [
  'research',
  'innovate',
  'spec',
  'implement',
  'validate',
  'review',
]

export const STAGE_LABEL: Record<BuddyStage, string> = {
  research: 'Research',
  innovate: 'Innovate',
  spec: 'Spec',
  implement: 'Implement',
  validate: 'Validate',
  review: 'Review',
}

export const OPTIONAL_STAGES: readonly BuddyStage[] = ['research', 'innovate', 'spec']

/** Buddy skills by their bare name, with the track column each one drives. */
const SKILL_STAGE: Record<string, BuddyStage | undefined> = {
  develop: undefined,
  research: 'research',
  brainstorm: 'innovate',
  innovate: 'innovate',
  spec: 'spec',
  implement: 'implement',
  'test-runner': 'validate',
  'review-code': 'review',
  'change-report': undefined,
  'archive-worklogs': undefined,
}

const SKILL_LABEL: Record<string, string> = {
  develop: 'Develop',
  research: 'Research',
  brainstorm: 'Brainstorm',
  innovate: 'Innovate',
  spec: 'Spec',
  implement: 'Implement',
  'test-runner': 'Test runner',
  'review-code': 'Code review',
  'change-report': 'Change report',
  'archive-worklogs': 'Archive worklogs',
}

const AGENT_STAGE: Record<string, BuddyStage | undefined> = {
  researcher: 'research',
  innovator: 'innovate',
  implementor: 'implement',
  'test-runner': 'validate',
  'code-reviewer': 'review',
  developer: undefined,
}

/**
 * Returns the bare Buddy skill name for a skill or slash-command name.
 * @param raw a name such as `buddy:spec` or `/buddy:spec`
 * @returns the bare name, or `undefined` when it is not a Buddy skill
 */
export function buddySkill(raw: string): string | undefined {
  const match = /^\/?buddy:([a-z-]+)$/.exec(raw.trim())
  const name = match?.[1]

  return name !== undefined && name in SKILL_STAGE ? name : undefined
}

/** Returns the bare Buddy agent type (`implementor`) of `buddy:implementor`. */
export function buddyAgent(raw: string): string | undefined {
  const match = /^buddy:([a-z-]+)$/.exec(raw.trim())
  const name = match?.[1]

  return name !== undefined && name in AGENT_STAGE ? name : undefined
}

export const skillStage = (skill: string): BuddyStage | undefined => SKILL_STAGE[skill]
export const agentStage = (agent: string): BuddyStage | undefined => AGENT_STAGE[agent]
export const skillLabel = (skill: string): string => SKILL_LABEL[skill] ?? skill

export function newFlow(skill: string, now: number): BuddyFlow {
  return enterStage(
    {
      entry: skill,
      skill,
      visited: [],
      stageChangedAt: now,
      startedAt: now,
      isWorking: true,
      tasks: [],
      agents: [],
      toolCount: 0,
      mainTokens: 0,
      stageTokens: {},
      stageCost: {},
      phaseCost: {},
    },
    skillStage(skill),
    now,
  )
}

/** Fills the usage fields a flow saved by an older version of this mod lacks. */
export function fillFlow(flow: BuddyFlow): BuddyFlow {
  const lacksStage = (agent: BuddyAgent): boolean => agent.stage === undefined && agentStage(agent.type) !== undefined

  return flow.stageTokens === undefined || flow.agents.some(agent => agent.tokens === undefined || lacksStage(agent))
    ? {
        ...flow,
        mainTokens: flow.mainTokens ?? 0,
        stageTokens: flow.stageTokens ?? {},
        stageCost: flow.stageCost ?? {},
        phaseCost: flow.phaseCost ?? {},
        agents: flow.agents.map(agent => {
          const stage = agent.stage ?? agentStage(agent.type)

          return { ...agent, tokens: agent.tokens ?? 0, ...(stage === undefined ? {} : { stage }) }
        }),
      }
    : flow
}

/**
 * Starts or continues the flow for a Buddy skill.
 * @param flow the flow on screen, if any
 * @param agentId the subagent that started the skill, absent for the main loop
 * @param isTurnRunning whether a main turn runs now; a subagent's skill marks the flow working only then
 * @returns a nested skill moves the same flow; a different entry replaces it
 */
export function startFlowSkill(
  flow: BuddyFlow | null,
  skill: string,
  agentId: string | undefined,
  now: number,
  isTurnRunning = true,
): BuddyFlow {
  if (flow === null) {
    return newFlow(skill, now)
  }

  const current = fillFlow(flow)

  // A subagent outside the flow (another run's, or a non-Buddy one) never takes an ended flow back.
  if (
    agentId !== undefined &&
    (current.isEnded === true || current.isPendingEnd === true) &&
    !current.agents.some(agent => agent.agentId === agentId)
  ) {
    return flow
  }

  if (agentId !== undefined || (current.entry === 'develop' && skill !== 'develop')) {
    // A background subagent loading a skill after the main turn ended does not make the main loop work.
    const isWorking = agentId === undefined || isTurnRunning || current.isWorking
    const moved = enterStage(reopenFlow(current, isWorking), skillStage(skill), now)

    return { ...moved, skill, isWorking }
  }

  if (current.entry === skill && current.isEnded !== true) {
    return { ...reopenFlow(current), isWorking: true }
  }

  // The person carries the run on by hand, as develop would: research, then spec.
  if (movesForward(current, skill)) {
    const going: BuddyFlow = { ...reopenFlow(current), isWorking: true }
    delete going.isReopened

    return { ...enterStage(going, skillStage(skill), now), entry: skill, skill }
  }

  const fresh = newFlow(skill, now)

  // An implementation keeps the spec of a run that has not ended; a finished run's spec is not this run's.
  return skill === 'implement' && current.spec && current.isEnded !== true ? { ...fresh, spec: current.spec } : fresh
}

/**
 * True when starting `skill` replaces the flow on screen with a new one: a new top-level entry.
 * A nested skill continues the flow, and reopens it when it had ended.
 */
export function startsNewFlow(flow: BuddyFlow | null, skill: string, agentId: string | undefined): boolean {
  if (flow === null) {
    return true
  }

  if (agentId !== undefined || (flow.entry === 'develop' && skill !== 'develop')) {
    return false
  }

  if (flow.entry === skill) {
    return flow.isEnded === true
  }

  return !movesForward(flow, skill)
}

/**
 * True when a top-level `skill` takes a run of another entry to a later stop of the track, such as
 * spec after research: the run goes on. A skill at or before the last stop reached starts a new run.
 */
function movesForward(flow: BuddyFlow, skill: string): boolean {
  const stage = skillStage(skill)

  if (flow.entry === 'develop' || stage === undefined || flow.visited.length === 0) {
    return false
  }

  return STAGES.indexOf(stage) > Math.max(...flow.visited.map(one => STAGES.indexOf(one)))
}

/**
 * Takes the flow back into work for a Buddy start (a Buddy subagent, a nested skill).
 *
 * An ended flow reopens. It ends again at its next idle point, or, for a develop run before review,
 * at its next main turn that starts no Buddy work, so it never keeps crediting later, unrelated turns.
 * The last cost reading is dropped, so cost from the unrelated work between is never credited:
 * the next reading is a new baseline.
 *
 * A pausing develop run (`isPendingEnd`) goes on, and the cost held back in this turn is credited
 * to the current stage.
 * @param isTurnRunning whether a main turn runs now; only then is the reopened flow working
 */
export function reopenFlow(flow: BuddyFlow, isTurnRunning = true): BuddyFlow {
  if (flow.isPendingEnd === true) {
    const held = flow.heldCost ?? 0
    const stage = flow.stage
    const going: BuddyFlow =
      held > 0
        ? {
            ...flow,
            costTotal: (flow.costTotal ?? 0) + held,
            ...(stage === undefined ? {} : { stageCost: { ...flow.stageCost, [stage]: (flow.stageCost[stage] ?? 0) + held } }),
          }
        : { ...flow }
    delete going.isPendingEnd
    delete going.heldCost
    delete going.pendingSnapshot

    return going
  }

  if (flow.isEnded !== true) {
    return flow
  }

  const open = { ...flow, isWorking: flow.isWorking || isTurnRunning, isReopened: true }
  delete open.isEnded
  delete open.costLast

  return open
}

/** Builds the record of a Buddy subagent the moment it is dispatched. */
export function makeAgent(input: {
  toolUseId: string
  agentId?: string
  type: string
  description: string
  phaseId?: string
  now: number
}): BuddyAgent {
  const stage = agentStage(input.type)

  return {
    toolUseId: input.toolUseId,
    type: input.type,
    description: input.description,
    status: 'running',
    tasks: [],
    tokens: 0,
    startedAt: input.now,
    ...(input.agentId === undefined ? {} : { agentId: input.agentId }),
    ...(input.phaseId === undefined ? {} : { phaseId: input.phaseId }),
    ...(stage === undefined ? {} : { stage }),
  }
}

/** Moves the flow to `stage`, keeping where it came from for the walk animation. */
export function enterStage(flow: BuddyFlow, stage: BuddyStage | undefined, now: number): BuddyFlow {
  if (stage === undefined || stage === flow.stage) {
    return flow
  }

  return {
    ...flow,
    previousStage: flow.stage,
    stage,
    stageChangedAt: now,
    visited: flow.visited.includes(stage) ? flow.visited : [...flow.visited, stage],
  }
}

export const isSpecPath = (path: string): boolean => /(^|\/)spec_[^/]+\.md$/.test(path)

export function phaseIdIn(text: string): string | undefined {
  return /\b(P\d+[a-z]?)\b/.exec(text)?.[1]
}

function listField(block: string, field: string): string[] {
  const inline = new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]`, 'm').exec(block)

  if (inline) {
    return inline[1]!
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
  }

  const listed = new RegExp(`^${field}:\\s*\\n((?:\\s*-\\s*.+\\n?)+)`, 'm').exec(block)

  return listed
    ? listed[1]!
        .split('\n')
        .map(line => line.replace(/^\s*-\s*/, '').trim())
        .filter(item => item.length > 0)
    : []
}

function scalarField(block: string, field: string): string | undefined {
  const value = new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(block)?.[1]?.trim()

  return value?.replace(/^(['"])(.*)\1$/, '$2')
}

/**
 * Reads the phases and AGENT LOG results of a Buddy spec.
 * @param path where the spec is, for display
 * @param text the spec's Markdown
 * @returns the spec, or `undefined` when it holds no phase blocks
 */
export function parseSpec(path: string, text: string): BuddySpec | undefined {
  const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() ?? path.replace(/^.*\/spec_|\.md$/g, '')
  const revision = Number(/^contract_revision:\s*(\d+)/m.exec(text)?.[1] ?? 1)
  const phasesAt = text.search(/^##\s+PHASES\b/m)
  const phaseText = phasesAt === -1 ? text : text.slice(phasesAt)
  const logged = new Map<string, BuddyPhaseStatus>()

  for (const line of text.matchAll(/^\s*-\s*(P\d+[a-z]?)\s+(SUCCESS|FAILURE|BLOCKED)\b/gm)) {
    logged.set(line[1]!, line[2]!.toLowerCase() as BuddyPhaseStatus)
  }

  const phases: BuddyPhase[] = []

  for (const block of phaseText.matchAll(/```ya?ml\s*\n([\s\S]*?)```/g)) {
    const body = block[1]!
    const id = scalarField(body, 'id')

    if (id === undefined || phases.some(phase => phase.id === id)) {
      continue
    }

    const runner = scalarField(body, 'agent')

    phases.push({
      id,
      goal: scalarField(body, 'goal') ?? id,
      requirements: listField(body, 'requirements'),
      criteria: listField(body, 'success_criteria'),
      status: logged.get(id) ?? 'pending',
      ...(runner === undefined ? {} : { runner }),
    })
  }

  return phases.length === 0 ? undefined : { path, title, revision, phases }
}

/**
 * Replaces a task list with a TodoWrite list.
 * @param previous the list before; an item with the same subject keeps its phase
 * @param phaseId the phase that new items belong to, if any
 */
export function applyTodoWrite(
  todos: readonly { content: string; status: BuddyTaskStatus }[],
  previous: readonly BuddyTask[] = [],
  phaseId?: string,
): BuddyTask[] {
  return todos.map((todo, index) => {
    const prior = previous.find(task => task.subject === todo.content)
    const phase = prior === undefined ? phaseId : prior.phaseId

    return { id: `todo-${index}`, subject: todo.content, status: todo.status, ...(phase === undefined ? {} : { phaseId: phase }) }
  })
}

export function applyTaskCreate(tasks: BuddyTask[], id: string, subject: string, phaseId?: string): BuddyTask[] {
  return [
    ...tasks.filter(task => task.id !== id),
    { id, subject, status: 'pending', ...(phaseId === undefined ? {} : { phaseId }) },
  ]
}

/** The one spec phase running now, if exactly one runs: the phase a new main-loop task belongs to. */
export function runningPhaseId(flow: BuddyFlow): string | undefined {
  const running = phaseViews(flow).filter(view => view.status === 'running')

  return running.length === 1 ? running[0]!.id : undefined
}

export function applyTaskUpdate(
  tasks: BuddyTask[],
  id: string,
  change: { status?: BuddyTaskStatus | 'deleted'; subject?: string },
): BuddyTask[] {
  if (change.status === 'deleted') {
    return tasks.filter(task => task.id !== id)
  }

  const status = change.status

  return tasks.map(task =>
    task.id === id
      ? {
          ...task,
          ...(status === undefined ? {} : { status }),
          ...(change.subject === undefined ? {} : { subject: change.subject }),
        }
      : task,
  )
}

const shortPath = (path: string): string => path.split('/').slice(-2).join('/')

const clip = (text: string, size: number): string =>
  text.length > size ? `${text.slice(0, size - 1)}…` : text

/**
 * Describes one tool call in a few words for the activity line.
 * @returns the words, or `undefined` for calls not worth showing
 */
export function activityOf(tool: string, input: Record<string, unknown>): string | undefined {
  const text = (key: string): string => (typeof input[key] === 'string' ? (input[key] as string) : '')

  switch (tool) {
    case 'Read':
      return `Reading ${shortPath(text('file_path'))}`
    case 'Edit':
    case 'MultiEdit':
      return `Editing ${shortPath(text('file_path'))}`
    case 'Write':
      return `Writing ${shortPath(text('file_path'))}`
    case 'Bash':
      return clip(text('description') || `Running ${text('command')}`, 72)
    case 'Grep':
      return `Searching for ${clip(text('pattern'), 40)}`
    case 'Glob':
      return `Finding ${clip(text('pattern'), 40)}`
    case 'WebFetch':
      return `Reading ${clip(text('url').replace(/^https?:\/\//, ''), 48)}`
    case 'WebSearch':
      return `Searching the web for ${clip(text('query'), 40)}`
    case 'Agent':
      return `Dispatching ${clip(text('description'), 48)}`
    case 'Skill':
      return `Loading ${text('skill')}`
    default:
      return undefined
  }
}

export type Progress = { done: number; total: number; fraction: number }

export function progressOf(tasks: readonly BuddyTask[]): Progress {
  const done = tasks.filter(task => task.status === 'completed').length
  const total = tasks.length
  const active = tasks.some(task => task.status === 'in_progress') ? 0.5 : 0

  return { done, total, fraction: total === 0 ? 0 : Math.min(1, (done + active) / total) }
}

const normalize = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** True when a task item stands for the phase (the implement host's Goal items). */
export function taskIsPhase(task: BuddyTask, phase: BuddyPhase): boolean {
  if (phaseIdIn(task.subject) === phase.id) {
    return true
  }

  const subject = normalize(task.subject)
  const goal = normalize(phase.goal)

  return subject.length >= 12 && (goal.startsWith(subject.slice(0, 24)) || subject.includes(goal.slice(0, 24)))
}

export type PhaseView = BuddyPhase & {
  agent?: BuddyAgent
  tasks: BuddyTask[]
  progress?: Progress
}

/**
 * Combines the spec's recorded results with the live agents and task lists.
 * @returns each phase with its live status, its own task list, and progress
 */
export function phaseViews(flow: BuddyFlow): PhaseView[] {
  const phases = flow.spec?.phases ?? []
  const phaseTasks = flow.tasks.filter(task => phases.some(phase => taskIsPhase(task, phase)))
  const workTasks = flow.tasks.filter(task => !phaseTasks.includes(task))

  const views = phases.map((phase): PhaseView => {
    const agents = flow.agents.filter(agent => agent.phaseId === phase.id)
    const agent = agents.find(one => one.status === 'running') ?? agents.at(-1)
    const item = phaseTasks.find(task => taskIsPhase(task, phase))
    let status = phase.status

    if (status === 'pending') {
      if (agent?.status === 'running' || item?.status === 'in_progress') {
        status = 'running'
      } else if (item?.status === 'completed') {
        status = 'success'
      }
    }

    return { ...phase, status, ...(agent ? { agent } : {}), tasks: agent?.tasks ?? [] }
  })

  // A phase is started when it has a subagent, a phase item in work or done, or a recorded result.
  const isStarted = (view: PhaseView): boolean => view.agent !== undefined || view.status !== 'pending'
  const isLaterStarted = (index: number): boolean => views.slice(index + 1).some(isStarted)

  // The host verifies and records a phase after its worker ends: while the main loop works, the
  // phase stays in work until its result is recorded, or until a later phase starts.
  for (const [index, view] of views.entries()) {
    if (view.status === 'pending' && view.agent !== undefined && flow.isWorking && !isLaterStarted(index)) {
      view.status = 'running'
    }
  }

  // A `Main` phase has no worker to show it: it is in work while the main loop works on the next
  // phase of an implementation, after every earlier phase succeeded.
  const next = views.findIndex(view => view.status !== 'success')
  const nextView = views[next]

  if (
    nextView !== undefined &&
    nextView.status === 'pending' &&
    nextView.runner?.toLowerCase() === 'main' &&
    flow.isWorking &&
    flow.stage === 'implement' &&
    !isLaterStarted(next)
  ) {
    nextView.status = 'running'
  }

  const running = views.filter(view => view.status === 'running')

  // Main-loop work of an earlier phase never counts for the phase that runs now.
  if (running.length === 1 && running[0]!.tasks.length === 0) {
    const id = running[0]!.id
    running[0]!.tasks = workTasks.filter(task => task.phaseId === undefined || task.phaseId === id)
  }

  return views.map(view => (view.tasks.length > 0 ? { ...view, progress: progressOf(view.tasks) } : view))
}

// ---------------------------------------------------------------------------
// The end of a flow: when it is finished, and what a pausing flow keeps.
// ---------------------------------------------------------------------------

/**
 * Marks the flow ended once it is finished: the main loop idle at the end of its route, no subagent running.
 * A reopened develop run idle before review may only be pausing for the person: its next turn decides.
 */
export function endIfFinished(flow: BuddyFlow): BuddyFlow {
  if (flow.isEnded === true) {
    return flow
  }

  if (isFinished(flow, phaseViews(flow))) {
    return { ...flow, isEnded: true }
  }

  const isIdle = !flow.isWorking && !flow.agents.some(agent => agent.status === 'running')

  return flow.isReopened === true && isIdle && flow.isPendingEnd !== true
    ? { ...flow, isPendingEnd: true, pendingSnapshot: snapshotOf(flow) }
    : flow
}

const SNAPSHOT_KEYS = ['tasks', 'spec', 'activity', 'toolCount', 'stage', 'previousStage', 'visited', 'stageChangedAt'] as const

function snapshotOf(flow: BuddyFlow): BuddyFlowSnapshot {
  const snapshot: Record<string, unknown> = {}

  for (const key of SNAPSHOT_KEYS) {
    if (flow[key] !== undefined) snapshot[key] = flow[key]
  }

  return snapshot as BuddyFlowSnapshot
}

/** Puts back what the flow tracked when it paused; a field absent then is absent again. */
export function restoreSnapshot(flow: BuddyFlow): BuddyFlow {
  const snapshot = flow.pendingSnapshot

  if (snapshot === undefined) {
    return flow
  }

  const restored: Record<string, unknown> = { ...flow }

  for (const key of SNAPSHOT_KEYS) {
    if (snapshot[key] === undefined) delete restored[key]
    else restored[key] = snapshot[key]
  }

  return restored as BuddyFlow
}

/**
 * True when the flow has reached the end of its route (or, reopened, any idle point) and neither the
 * main loop nor a subagent is running.
 */
export function isFinished(flow: BuddyFlow, phases: readonly PhaseView[]): boolean {
  if (flow.isWorking || flow.agents.some(agent => agent.status === 'running')) {
    return false
  }

  if (flow.stage === 'review') {
    return true
  }

  // A reopened run ends at its next idle point, except a develop run before review (see endIfFinished).
  if (flow.isReopened === true) {
    return flow.entry !== 'develop'
  }

  // develop can loop back from validation to implementation; only its review ends it.
  if (flow.entry === 'develop') {
    return false
  }

  if (flow.stage === undefined) {
    return true
  }

  // A delivered spec ends only an implementation run; research, innovate or spec work on it goes on.
  return (
    STAGES.indexOf(flow.stage) >= STAGES.indexOf('implement') &&
    phases.length > 0 &&
    phases.every(phase => phase.status === 'success')
  )
}

/**
 * Takes a newer reading of the flow's own spec file into an ended or pausing flow: phases, results,
 * revision and title only. Stage, tasks, activity, the ended state and crediting stay as they are.
 */
export function refreshSpec(flow: BuddyFlow, spec: BuddySpec): BuddyFlow {
  if (flow.spec?.path !== spec.path) {
    return flow
  }

  const snapshot = flow.pendingSnapshot

  return {
    ...flow,
    spec,
    ...(snapshot?.spec?.path === spec.path ? { pendingSnapshot: { ...snapshot, spec } } : {}),
  }
}
