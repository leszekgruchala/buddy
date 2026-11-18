import { createHash, randomUUID } from 'node:crypto';
import { copyFile, cp, lstat, mkdir, readFile, readdir, realpath, rename, rm, chmod, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { checkCancelled, message, object } from './types.ts';
import { assertRealParents, readRegularJson } from './paths.ts';
import type { Agent, Context, MarketplaceName, Source } from './types.ts';
import { verifyBuddyDirectory } from './native.ts';

const marker = '.buddy-cli-owned.json';
const excluded = new Set(['.git', '.ai', 'ai', 'node_modules', '.idea', '.DS_Store', '.plugin-eval', 'cli']);
const maxBytes = 128 * 1024 * 1024;

/** A local copy has no root Git checkout from which updates can be reproduced. */
export class CheckoutRootError extends Error {}

/** An existing directory has no Buddy CLI ownership marker. */
export class UnmarkedSnapshotError extends Error {}

export function snapshotPath(context: Context, agent: Agent): string {
  return agent === 'cursor' ? join(context.home, '.cursor/plugins/local/buddy') : join(context.data, 'snapshots', agent);
}

/** Validate the requested Buddy checkout before any installation changes. */
export async function checkout(path: string, context: Context): Promise<{ path: string; version: string }> {
  checkCancelled(context);
  const root = await realpath(resolve(path));
  const result = await context.run({ bin: 'git', args: ['rev-parse', '--show-toplevel'], cwd: root });
  checkCancelled(context);
  if (result.code !== 0 || await realpath(result.stdout.trim()) !== root) throw new CheckoutRootError('--from must name the root of a Buddy Git checkout.');
  return { path: root, version: await buddyVersion(root) };
}

async function buddyVersion(root: string): Promise<string> {
  let version: string | undefined;
  for (const harness of ['claude', 'codex', 'cursor']) {
    const name = `.${harness}-plugin/plugin.json`;
    const file = join(root, name);
    let manifest: unknown;
    try {
      if ((await lstat(file)).isSymbolicLink() || await realpath(file) !== file) throw new Error('Buddy manifests must not cross symlinks.');
      manifest = await readRegularJson(file);
    } catch (error) {
      if (object(error) && error.code === 'ENOENT') throw new Error(`Missing Buddy manifest: ${name}.`, { cause: error });
      throw error;
    }
    if (!object(manifest) || manifest.name !== 'buddy' || typeof manifest.version !== 'string' || !manifest.version.trim()) {
      throw new Error(`The directory is not a valid Buddy plugin. Check ${name}.`);
    }
    if (version && version !== manifest.version) throw new Error('Buddy manifest versions differ.');
    version = manifest.version;
  }
  if (!version) throw new Error('The checkout has no Buddy version.');
  return version;
}

/** Hash names, permissions, and contents in a snapshot tree, ignoring its ownership marker. */
export async function snapshotDigest(root: string): Promise<string> {
  const hash = createHash('sha256');
  let bytes = 0;
  let count = 0;
  async function walk(directory: string): Promise<void> {
    for (const name of (await readdir(directory)).sort()) {
      if (directory === root && name === marker) continue;
      const path = join(directory, name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error(`Snapshot contains a symlink: ${path}`);
      if (info.isDirectory()) {
        hash.update(JSON.stringify(['directory', relative(root, path), info.mode & 0o777]) + '\n');
        await walk(path); continue;
      }
      if (!info.isFile()) throw new Error(`Snapshot contains a special file: ${path}`);
      bytes += info.size;
      if (++count > 10_000 || bytes > maxBytes) throw new Error('Snapshot exceeds the file or size limit.');
      const contentHash = createHash('sha256').update(await readFile(path)).digest('hex');
      hash.update(JSON.stringify(['file', relative(root, path), info.mode & 0o777, info.size, contentHash]) + '\n');
    }
  }
  await walk(root);
  return hash.digest('hex');
}

function recoveryRoots(context: Context, agent: Agent): string[] {
  const primary = resolve(context.data, 'backups');
  if (agent !== 'cursor') return [primary];
  const discovery = dirname(snapshotPath(context, 'cursor'));
  const fallback = join(context.home, '.cursor/plugins/buddy-cli-backups');
  return primary === discovery || primary.startsWith(discovery + sep) ? [fallback] : [primary, fallback];
}

/** Preserve a byte-verified private backup before adopting or switching local plugin files. */
async function backupDirectory(path: string, agent: Agent, context: Context): Promise<string> {
  const before = await snapshotDigest(path);
  const [parent] = recoveryRoots(context, agent);
  await assertRealParents(parent);
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const backup = join(parent, `${agent}-${Date.now()}-${randomUUID()}`);
  try {
    await cp(path, backup, { recursive: true, errorOnExist: true, force: false });
    if (before !== await snapshotDigest(backup) || before !== await snapshotDigest(path)) throw new Error('Existing Buddy files changed while creating their backup.');
    checkCancelled(context);
    return backup;
  } catch (error) { await rm(backup, { recursive: true, force: true }); throw error; }
}

async function archiveDisplaced(path: string, agent: Agent, context: Context): Promise<string> {
  const parents = recoveryRoots(context, agent);
  for (const [index, parent] of parents.entries()) {
    await assertRealParents(parent);
    await mkdir(parent, { recursive: true, mode: 0o700 });
    const target = join(parent, `${agent}-displaced-${Date.now()}-${randomUUID()}`);
    try { await rename(path, target); return target; } catch (error) {
      if (object(error) && error.code === 'EXDEV' && index < parents.length - 1) continue;
      throw new Error(`Could not archive Buddy files at ${path}: ${message(error)}`, { cause: error });
    }
  }
  throw new Error(`Could not archive Buddy files at ${path}.`);
}

async function publishSnapshot(stage: string, destination: string, existed: boolean, agent: Agent, context: Context): Promise<string | undefined> {
  checkCancelled(context);
  // An editor can still write through a handle after rename. Archive the directory itself.
  const displaced = existed ? await archiveDisplaced(destination, agent, context) : undefined;
  try {
    checkCancelled(context);
    await rename(stage, destination);
  } catch (error) {
    if (displaced) {
      try { await rename(displaced, destination); }
      catch (restoreError) { throw new Error(`${message(error)} Could not restore the previous snapshot: ${message(restoreError)}. Files remain at ${displaced}.`, { cause: error }); }
    }
    throw error;
  }
  return displaced;
}

interface CursorAdoption {
  backup: string;
  unmark: (directory: string) => Promise<void>;
}

/** Back up and mark a verified Cursor Buddy copy, with a way to undo the marker on the original inode. */
export async function adoptCursor(context: Context, source: string): Promise<CursorAdoption | undefined> {
  const root = snapshotPath(context, 'cursor');
  await assertRealParents(root);
  try { await lstat(join(root, marker)); return; } catch (error) {
    if (!object(error) || error.code !== 'ENOENT') throw error;
  }
  let original;
  try { original = await lstat(root); } catch (error) {
    if (object(error) && error.code === 'ENOENT') return;
    throw error;
  }
  await verifyBuddyDirectory(root, 'cursor');
  const backup = await backupDirectory(root, 'cursor', context);
  let ownership: string;
  try {
    const protectedDigest = await snapshotDigest(backup);
    const currentDigest = await snapshotDigest(root);
    const current = await lstat(root);
    if (currentDigest !== protectedDigest || current.dev !== original.dev || current.ino !== original.ino) {
      throw new Error('Cursor files changed after their backup. Adoption stopped without replacing them.');
    }
    ownership = JSON.stringify({ owner: 'buddy-cli', schema: 1, manager: resolve(context.data), agent: 'cursor', source, digest: protectedDigest });
    checkCancelled(context);
    await writeFile(join(root, marker), ownership + '\n', { flag: 'wx', mode: 0o600 });
  } catch (error) {
    throw new Error(`${message(error)} Retained backup: ${backup}.`, { cause: error });
  }
  return { backup, unmark: async directory => {
    const current = await lstat(directory);
    if (current.dev !== original.dev || current.ino !== original.ino || JSON.stringify(await readOwnership(directory)) !== ownership) {
      throw new Error(`Cursor ownership changed at ${directory}. Inspect it before retrying.`);
    }
    await rm(join(directory, marker));
  } };
}

/** Recover source provenance only after validating the complete manager-owned snapshot. */
export async function snapshotSource(context: Context, agent: Agent): Promise<string> {
  const root = snapshotPath(context, agent);
  const value = await readOwnership(root);
  if (!object(value) || typeof value.source !== 'string' || !await assertOwned(root, context, agent, value.source)) throw new Error('The managed snapshot has no verified source.');
  return value.source;
}

/** Restore a preserved local backup and return the archive for any replaced snapshot. */
export async function restoreSnapshot(context: Context, agent: Agent, source: string, backup: string): Promise<string | undefined> {
  const destination = snapshotPath(context, agent);
  const roots = recoveryRoots(context, agent);
  if (!roots.some(root => resolve(backup).startsWith(root + sep))) throw new Error('The snapshot backup is outside the manager recovery directories.');
  await assertRealParents(backup);
  await assertRealParents(dirname(destination));
  const existed = await assertOwned(destination, context, agent, source);
  const expected = await snapshotDigest(backup);
  const stage = join(dirname(destination), `.buddy-restore-${randomUUID()}`);
  try {
    await cp(backup, stage, { recursive: true, errorOnExist: true, force: false });
    if (await snapshotDigest(stage) !== expected) throw new Error('Snapshot backup changed during restoration.');
    if (await assertOwned(destination, context, agent, source) !== existed) throw new Error('The active snapshot changed during restoration.');
    return await publishSnapshot(stage, destination, existed, agent, context);
  } finally { await rm(stage, { recursive: true, force: true }); }
}

/** Refuse to replace or delete unowned folders and snapshots edited outside the manager. */
export async function assertOwned(path: string, context: Context, agent: Agent, source: string): Promise<boolean> {
  let value: unknown;
  try { value = await readOwnership(path); } catch (error) {
    if (object(error) && error.code === 'ENOENT') return false;
    throw error;
  }
  if (!object(value) || value.owner !== 'buddy-cli' || value.schema !== 1 || value.manager !== resolve(context.data)
    || value.agent !== agent || value.source !== source || value.digest !== await snapshotDigest(path)) {
    throw new Error(`Snapshot ownership or contents changed at ${path}. Preserve the folder and inspect it before retrying.`);
  }
  return true;
}

async function readOwnership(path: string): Promise<unknown> {
  const info = await lstat(path);
  if (!info.isDirectory() || info.isSymbolicLink() || await realpath(path) !== resolve(path)) throw new Error(`Refusing a non-directory or symlink at ${path}.`);
  const file = join(path, marker);
  const errorMessage = `Refusing to change an unmanaged folder at ${path}.`;
  try {
    return await readRegularJson(file);
  } catch (error) {
    if (object(error) && error.code === 'ENOENT') throw new UnmarkedSnapshotError(errorMessage, { cause: error });
    throw new Error(errorMessage, { cause: error });
  }
}

/**
 * Stage a filtered checkout and replace only a verified manager-owned snapshot.
 * @returns Retained backup paths, with the original content copy first when one was made.
 */
export async function snapshot(
  source: Extract<Source, { kind: 'local' }>, agent: Agent, context: Context,
  options: { marketplace?: MarketplaceName; previousSource?: string; expectedVersion?: string; requireAbsent?: boolean; adoptExistingCursor?: boolean } = {},
): Promise<string[]> {
  checkCancelled(context);
  const destination = snapshotPath(context, agent);
  const root = await realpath(source.path);
  if (root === resolve(destination) || root.startsWith(resolve(destination) + sep) || resolve(destination).startsWith(root + sep)) throw new Error('Checkout and snapshot paths must not overlap.');
  await assertRealParents(dirname(destination));
  await mkdir(dirname(destination), { recursive: true });
  const parent = await realpath(dirname(destination));
  const target = join(parent, relative(dirname(destination), destination));
  if (root === target || root.startsWith(target + sep) || target.startsWith(root + sep)) throw new Error('Checkout and snapshot paths must not overlap.');
  const oldSource = options.previousSource ?? source.path;
  const canAdopt = agent === 'cursor' && options.adoptExistingCursor && !options.requireAbsent;
  let existed = canAdopt ? undefined : await assertOwned(destination, context, agent, oldSource);
  if (options.requireAbsent && existed) throw new Error('The snapshot reappeared before repair. Inspect it before retrying.');
  const files = await context.run({ bin: 'git', args: ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd: root });
  checkCancelled(context);
  if (files.code !== 0) throw new Error('Cannot list non-ignored checkout files.');
  const stage = join(parent, `.buddy-stage-${randomUUID()}`);
  await mkdir(stage);
  const retained: string[] = [];
  let adoption: CursorAdoption | undefined;
  let published = false;
  try {
    const plugin = agent === 'cursor' ? stage : join(stage, 'buddy');
    await mkdir(plugin, { recursive: true });
    let total = 0;
    const names = [...new Set(files.stdout.split('\0').filter(Boolean))];
    if (names.length > 10_000) throw new Error('Checkout exceeds the snapshot file limit.');
    for (const name of names) {
      checkCancelled(context);
      const parts = name.split('/');
      if (isAbsolute(name) || parts.includes('..') || parts.includes('')) throw new Error('Git returned an unsafe checkout path.');
      if (parts.some(part => excluded.has(part) || part === marker || part === '__pycache__')) continue;
      const from = join(root, name);
      let info;
      try { info = await lstat(from); } catch (error) {
        if (object(error) && error.code === 'ENOENT') continue;
        throw error;
      }
      if (info.isSymbolicLink()) throw new Error(`Checkout contains a symlink: ${name}`);
      if (!info.isFile()) throw new Error(`Checkout contains a special file: ${name}`);
      if (await realpath(from) !== from) throw new Error(`Checkout path crosses a symlink: ${name}`);
      total += info.size;
      if (total > maxBytes) throw new Error('Checkout exceeds the snapshot size limit.');
      const to = join(plugin, name);
      await mkdir(dirname(to), { recursive: true });
      await copyFile(from, to);
      await chmod(to, info.mode & 0o777);
    }
    const version = await buddyVersion(plugin);
    if (options.expectedVersion !== undefined && version !== options.expectedVersion) throw new Error('Buddy manifest versions changed during staging. Retry with the current checkout.');
    if (agent !== 'cursor') {
      const market = agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json';
      const name = options.marketplace ?? 'buddy-local';
      const content = agent === 'codex'
        ? { name, interface: { displayName: 'Buddy local' }, plugins: [{ name: 'buddy', source: { source: 'local', path: './buddy' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }] }
        : { name, owner: { name: 'Buddy' }, plugins: [{ name: 'buddy', source: './buddy' }] };
      await mkdir(dirname(join(stage, market)), { recursive: true });
      await writeFile(join(stage, market), JSON.stringify(content, null, 2) + '\n');
    }
    await writeFile(join(stage, marker), JSON.stringify({ owner: 'buddy-cli', schema: 1, manager: resolve(context.data), agent, source: source.path, digest: await snapshotDigest(stage) }) + '\n');
    checkCancelled(context);
    if (canAdopt) {
      adoption = await adoptCursor(context, source.path);
      if (adoption) retained.push(adoption.backup);
    }
    existed ??= await assertOwned(destination, context, agent, oldSource);
    const preserved = existed && oldSource !== source.path ? await backupDirectory(destination, agent, context) : undefined;
    if (preserved) retained.push(preserved);
    if (await assertOwned(destination, context, agent, oldSource) !== existed) throw new Error('The active snapshot changed during staging.');
    const displaced = await publishSnapshot(stage, destination, existed, agent, context);
    published = true;
    if (displaced) {
      retained.push(displaced);
      let changed = false;
      try { changed = !await assertOwned(displaced, context, agent, oldSource); } catch { changed = true; }
      if (changed) {
        try {
          await adoption?.unmark(displaced);
          const rejected = await restoreSnapshot({ ...context, signal: undefined }, agent, source.path, displaced);
          if (rejected) retained.push(rejected);
        } catch (error) { throw new Error(`Concurrent changes detected. Files were preserved at ${displaced}, but restoration failed: ${String(error)}`); }
        throw new Error(`Concurrent changes detected during refresh. The displaced files were restored and preserved at ${displaced}; inspect them before retrying.`);
      }
    }
    return retained;
  } catch (error) {
    let failure = error;
    if (adoption && !published) {
      try { await adoption.unmark(destination); }
      catch (undoError) { failure = new Error(`${message(error)} Could not clear the Cursor adoption marker: ${message(undoError)}`, { cause: error }); }
    }
    if (!retained.length) throw failure;
    throw new Error(`${message(failure)} Retained backups: ${retained.join(', ')}.`, { cause: failure });
  } finally { await rm(stage, { recursive: true, force: true }); }
}

/** Archive a verified snapshot outside plugin discovery and return its path, if present. */
export async function removeSnapshot(context: Context, agent: Agent, source: string): Promise<string | undefined> {
  const path = snapshotPath(context, agent);
  if (!await assertOwned(path, context, agent, source)) return;
  checkCancelled(context);
  return archiveDisplaced(path, agent, context);
}
