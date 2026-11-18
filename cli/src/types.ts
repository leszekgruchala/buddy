export const agents = ['codex', 'claude', 'cursor'] as const;
export type Agent = (typeof agents)[number];
export type Operation = 'install' | 'update' | 'uninstall' | 'doctor';
export type Source = { kind: 'github' } | { kind: 'local'; path: string };
export type MarketplaceName = 'buddy' | 'buddy-local';
export interface Target { source: Source; version?: string; marketplace?: MarketplaceName }
export interface State { schema: 1; targets: Partial<Record<Agent, Target>> }
export interface Command {
  bin: string;
  args: string[];
  cwd?: string;
  /** Shorter deadline for a read-only diagnostic probe. */
  timeoutMs?: number;
  signal?: AbortSignal;
}
export interface CommandResult { code: number; stdout: string; stderr: string }
export type Runner = (command: Command) => Promise<CommandResult>;
export interface Context {
  home: string;
  data: string;
  run: Runner;
  /** Bounded runner independent of signal, used only to restore prior registrations. */
  cleanupRun: Runner;
  signal?: AbortSignal;
  claudeConfig?: string;
}
export interface Result {
  agent: Agent;
  status: 'ok' | 'planned' | 'needs-action' | 'error';
  source?: Source;
  version?: string;
  commands: Command[];
  actions: string[];
  message: string;
}

/** Narrow JSON objects at persisted and native CLI boundaries. */
export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Return an actionable message without losing non-Error failures. */
export function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Stop before another target or filesystem commit after cancellation. */
export function checkCancelled(context: Context): void {
  if (context.signal?.aborted) throw new Error('Operation cancelled.');
}
