import { mkdir, rename, rm, writeFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { agents, checkCancelled, object } from './types.ts';
import { assertRealParents, readRegularJson } from './paths.ts';
import type { Context, State } from './types.ts';

function missing(error: unknown): boolean {
  return object(error) && error.code === 'ENOENT';
}

/** Read and validate state; reject damaged records instead of losing source ownership. */
export async function loadState(data: string): Promise<State> {
  let value: unknown;
  try { value = await readRegularJson(join(data, 'state.json')); } catch (error) {
    if (missing(error)) return { schema: 1, targets: {} };
    throw new Error('Cannot read Buddy CLI state. Preserve state.json and correct it before retrying.', { cause: error });
  }
  if (!object(value) || value.schema !== 1 || !object(value.targets)) throw new Error('Invalid Buddy CLI state.');
  const state: State = { schema: 1, targets: {} };
  if (Object.keys(value.targets).some(key => !agents.some(agent => agent === key))) throw new Error('Invalid Buddy CLI target.');
  for (const agent of agents) {
    const target = value.targets[agent];
    if (target === undefined) continue;
    if (!object(target) || !object(target.source)) throw new Error('Invalid Buddy CLI target.');
    const source = target.source;
    if (source.kind !== 'github' && !(source.kind === 'local' && typeof source.path === 'string' && source.path.startsWith('/'))) {
      throw new Error('Invalid Buddy CLI source.');
    }
    if (target.version !== undefined && typeof target.version !== 'string') throw new Error('Invalid Buddy CLI version.');
    if (target.marketplace !== undefined && target.marketplace !== 'buddy' && target.marketplace !== 'buddy-local') throw new Error('Invalid Buddy marketplace identity.');
    state.targets[agent] = {
      source: source.kind === 'github' ? { kind: 'github' } : { kind: 'local', path: String(source.path) },
      ...(typeof target.version === 'string' ? { version: target.version } : {}),
      ...(target.marketplace === 'buddy' || target.marketplace === 'buddy-local' ? { marketplace: target.marketplace } : {}),
    };
  }
  return state;
}

/** Atomically persist a validated operation result in the manager's private directory. */
export async function saveState(context: Context, state: State): Promise<void> {
  checkCancelled(context);
  const temp = join(context.data, `state-${randomUUID()}.tmp`);
  try {
    await writeFile(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    checkCancelled(context);
    await rename(temp, join(context.data, 'state.json'));
  } finally { await rm(temp, { force: true }); }
}

/** Serialize mutations; never take over another process's lock or a symlinked data directory. */
export async function lock(context: Context): Promise<() => Promise<void>> {
  checkCancelled(context);
  await assertRealParents(context.data);
  await mkdir(context.data, { recursive: true, mode: 0o700 });
  if ((await lstat(context.data)).isSymbolicLink()) throw new Error('BUDDY_HOME must be a real directory.');
  const path = join(context.data, 'lock');
  try { await mkdir(path); } catch (error) {
    throw new Error(`Another Buddy CLI mutation holds ${path}. If it stopped, inspect and remove that lock before retrying.`, { cause: error });
  }
  return () => rm(path, { recursive: true });
}

/** Coordinate the single Cursor local destination across independent manager homes. */
export async function lockCursor(context: Context): Promise<() => Promise<void>> {
  checkCancelled(context);
  const root = join(context.home, '.cursor/plugins/local');
  await assertRealParents(root);
  await mkdir(root, { recursive: true });
  checkCancelled(context);
  const path = join(root, '.buddy-cli-lock');
  try { await mkdir(path); } catch (error) {
    throw new Error(`Another manager holds the Cursor snapshot lock at ${path}.`, { cause: error });
  }
  return () => rm(path, { recursive: true });
}
