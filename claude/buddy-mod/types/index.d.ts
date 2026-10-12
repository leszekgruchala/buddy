/** A column of the Buddy SDLC track. */
export type BuddyStage =
  | 'research'
  | 'innovate'
  | 'spec'
  | 'implement'
  | 'validate'
  | 'review'

export type BuddyTaskStatus = 'pending' | 'in_progress' | 'completed'

/** One item of a native task list (TodoWrite or TaskCreate/TaskUpdate). */
export type BuddyTask = {
  id: string
  subject: string
  status: BuddyTaskStatus
  /** The spec phase that ran in the main loop when the main loop made the task. */
  phaseId?: string
}

export type BuddyPhaseStatus = 'pending' | 'running' | 'success' | 'failure' | 'blocked'

/** One phase delta of a Buddy spec, with the status its AGENT LOG records. */
export type BuddyPhase = {
  id: string
  goal: string
  requirements: string[]
  criteria: string[]
  status: BuddyPhaseStatus
  /** The phase's `agent` field: `Main` runs it in the main loop; absent means a worker. */
  runner?: string
}

export type BuddySpec = {
  path: string
  title: string
  revision: number
  phases: BuddyPhase[]
}

/** Token counts of a loop, split the way the API reports them. */
export type BuddyCounts = { input: number; output: number; cacheRead: number; cacheWrite: number }

/** One Buddy subagent (researcher, implementor, ...) this flow dispatched. */
export type BuddyAgent = {
  toolUseId: string
  agentId?: string
  type: string
  description: string
  /** The stage its type drives; its tokens count toward that stage. */
  stage?: BuddyStage
  phaseId?: string
  /** Total tokens of its run; stays 0 until the run ends. */
  tokens: number
  /** The token counts behind `tokens`: from its own turns or from the Agent result, whichever total is larger. */
  counts?: BuddyCounts
  /** Its own turns' usage, summed; never mixed with the Agent result. */
  turnCounts?: BuddyCounts
  /** The Agent result's total and usage for the same run. */
  resultTokens?: number
  resultCounts?: BuddyCounts
  model?: string
  status: 'running' | 'done' | 'failed'
  activity?: string
  tasks: BuddyTask[]
  startedAt: number
}

/** The tracked fields of a flow that a turn which is not the flow's must not change. */
export type BuddyFlowSnapshot = Pick<
  BuddyFlow,
  'tasks' | 'spec' | 'activity' | 'toolCount' | 'stage' | 'previousStage' | 'visited' | 'stageChangedAt'
>

/** The Buddy run on screen: one top-level skill and everything it started. */
export type BuddyFlow = {
  entry: string
  skill: string
  stage?: BuddyStage
  visited: BuddyStage[]
  stageChangedAt: number
  previousStage?: BuddyStage
  startedAt: number
  isWorking: boolean
  spec?: BuddySpec
  tasks: BuddyTask[]
  agents: BuddyAgent[]
  activity?: string
  toolCount: number
  /** Tokens of the main loop, summed over its turns. */
  mainTokens: number
  mainModel?: string
  /** Price-table estimate of the main loop's cost, in USD; absent while no turn had a priced model. */
  mainCost?: number
  /** Main-loop tokens by the stage current when they arrived. */
  stageTokens: Partial<Record<BuddyStage, number>>
  /** Session-cost growth by the stage current at the poll, in USD. */
  stageCost: Partial<Record<BuddyStage, number>>
  /** Session-cost growth credited to the one running phase, in USD. */
  phaseCost: Record<string, number>
  /** Sum of the positive session-cost growth since the flow began; absent while the session reports no cost. */
  costTotal?: number
  /** The last `cost.usd` the poll read. */
  costLast?: number
  /** Set once the flow reached done; later turns and cost polls no longer credit it or mark it live. */
  isEnded?: boolean
  /** Set when a nested stage start took an ended flow back into work; it then ends at its next idle point. */
  isReopened?: boolean
  /**
   * A reopened develop run paused before review: its next main turn ends it unless that turn starts
   * Buddy work. Cost growth in that turn is held in `heldCost` until it is decided.
   */
  isPendingEnd?: boolean
  heldCost?: number
  /** What the flow tracked when it paused; restored if the deciding turn turns out not to be the flow's. */
  pendingSnapshot?: BuddyFlowSnapshot
}

declare module 'claude-code' {
  interface PluginState {
    buddy: { flow: BuddyFlow | null; shown: BuddyFlow | null; isHidden: boolean; tick: number; isTurnRunning: boolean }
  }
}
