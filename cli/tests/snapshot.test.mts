import assert from 'node:assert/strict';
import { lstat, open, readFile, readdir, rm, symlink, mkdir } from 'node:fs/promises';
import fsPromises from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { TestContext } from 'node:test';
import { join } from 'node:path';
import { test } from 'node:test';
import { adoptCursor, assertOwned, checkout, snapshot, snapshotPath, removeSnapshot, restoreSnapshot } from '../src/snapshot.ts';
import { fixture, legacyCursor, put } from './helpers.ts';
import { lockCursor } from '../src/storage.ts';
import { manage } from '../src/manager.ts';

function editOnDigestRead(t: TestContext, watched: string, saveAt: number): () => void {
  const original = fsPromises.readFile;
  let reads = 0;
  t.mock.method(fsPromises, 'readFile', async (...args: Parameters<typeof readFile>) => {
    const content = await original(...args);
    if (args[0] === watched && ++reads === saveAt) await fsPromises.writeFile(watched, 'editor saved during refresh\n');
    return content;
  });
  syncBuiltinESMExports();
  return () => { t.mock.restoreAll(); syncBuiltinESMExports(); };
}

test('a verified legacy Cursor copy is backed up before adoption and supports later updates', async t => {
  const f = await legacyCursor(t);
  const root = f.local;
  await put(root, 'personal.txt', 'preserve this customization\n');
  await put(f.source, 'skills/demo/SKILL.md', 'Refreshed\n');
  const result = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  assert.equal(result[0].status, 'needs-action', result[0].message);
  const backups = await readdir(join(f.context.data, 'backups'));
  assert.equal(await readFile(join(f.context.data, 'backups', backups[0], 'personal.txt'), 'utf8'), 'preserve this customization\n');
  assert.equal(await readFile(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'Refreshed\n');
  const update = await manage(f.context, { operation: 'update', agents: ['cursor'] });
  assert.equal(update[0].status, 'needs-action');
  const after = await readdir(join(f.context.data, 'backups'));
  assert.equal(after.length, backups.length + 1);
  assert.ok(backups.every(path => after.includes(path)));
});

test('removing a recorded Cursor ownership marker cannot authorize replacement of local edits', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  const root = snapshotPath(f.context, 'cursor');
  await rm(join(root, '.buddy-cli-owned.json'));
  await put(root, 'skills/demo/SKILL.md', 'keep this local edit\n');
  const result = await manage(f.context, { operation: 'update', agents: ['cursor'] });
  assert.equal(result[0].status, 'error');
  assert.equal(await readFile(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'keep this local edit\n');
  await assert.rejects(lstat(join(f.context.data, 'backups')), { code: 'ENOENT' });
});

test('Cursor adoption rejects an edit made after backup verification instead of trusting unbacked files', async t => {
  const f = await legacyCursor(t);
  const root = f.local;
  const watched = join(root, 'skills/demo/SKILL.md');
  const restore = editOnDigestRead(t, watched, 2);
  try { await assert.rejects(adoptCursor(f.context, f.source), /changed after their backup/); }
  finally { restore(); }
  assert.equal(await readFile(watched, 'utf8'), 'editor saved during refresh\n');
  const backups = await readdir(join(f.context.data, 'backups'));
  assert.match(await readFile(join(f.context.data, 'backups', backups[0], 'skills/demo/SKILL.md'), 'utf8'), /Before/);
  await assert.rejects(lstat(join(root, '.buddy-cli-owned.json')), { code: 'ENOENT' });
});

test('Cursor adoption preserves an edit made during the last ownership check in the displaced directory', async t => {
  const f = await legacyCursor(t);
  const restore = editOnDigestRead(t, join(f.local, 'skills/demo/SKILL.md'), 5);
  let result;
  try { result = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source }); }
  finally { restore(); }
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /Concurrent changes/);
  const backups = await readdir(join(f.context.data, 'backups'));
  const contents = await Promise.all(backups.map(path => readFile(join(f.context.data, 'backups', path, 'skills/demo/SKILL.md'), 'utf8')));
  assert.ok(contents.includes('editor saved during refresh\n'));
});

test('Cursor update does not recreate a manually removed installation', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  const root = snapshotPath(f.context, 'cursor');
  await rm(root, { recursive: true });
  assert.equal((await manage(f.context, { operation: 'update', agents: ['cursor'] }))[0].status, 'needs-action');
  await assert.rejects(lstat(root), { code: 'ENOENT' });
  assert.equal((await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source }))[0].status, 'needs-action');
  assert.equal((await lstat(root)).isDirectory(), true);
});

test('failed first Cursor adoption restores the original unmarked directory', async t => {
  const f = await legacyCursor(t);
  await put(f.local, 'personal.txt', 'original personal files\n');
  const run = f.context.run;
  f.context.run = async cmd => {
    const result = await run(cmd);
    if (cmd.bin === 'git' && cmd.args[0] === 'ls-files') await mkdir(join(f.context.data, 'state.json'));
    return result;
  };
  const result = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].actions.join(' '), /previous local files were restored/);
  await assert.rejects(lstat(join(f.local, '.buddy-cli-owned.json')), { code: 'ENOENT' });
  assert.equal(await readFile(join(f.local, 'personal.txt'), 'utf8'), 'original personal files\n');
});

test('Cursor displaced originals use same-volume recovery outside plugin discovery on EXDEV', async t => {
  const f = await legacyCursor(t);
  await put(f.local, 'personal.txt', 'cross-volume original\n');
  const inode = (await lstat(f.local)).ino;
  const original = fsPromises.rename;
  t.mock.method(fsPromises, 'rename', async (...args: Parameters<typeof original>) => {
    if (args[0] === f.local && String(args[1]).startsWith(join(f.context.data, 'backups'))) throw Object.assign(new Error('cross-device fixture'), { code: 'EXDEV' });
    return original(...args);
  });
  syncBuiltinESMExports();
  let result;
  try { result = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source }); }
  finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal(result[0].status, 'needs-action', result[0].message);
  const recovery = join(f.home, '.cursor/plugins/buddy-cli-backups');
  const saved = join(recovery, (await readdir(recovery))[0]);
  assert.equal((await lstat(saved)).ino, inode);
  assert.equal(await readFile(join(saved, 'personal.txt'), 'utf8'), 'cross-volume original\n');
  const content = join(f.context.data, 'backups', (await readdir(join(f.context.data, 'backups')))[0]);
  assert.equal(await readFile(join(content, 'personal.txt'), 'utf8'), 'cross-volume original\n');
  assert.deepEqual(await readdir(join(f.home, '.cursor/plugins/local')), ['buddy']);
});

test('Cursor archives stay outside local plugin discovery with a custom manager directory', async t => {
  const f = await fixture(t);
  const context = { ...f.context, data: join(f.home, '.cursor/plugins/local/buddy-data') };
  const source = { kind: 'local' as const, path: f.source };
  await snapshot(source, 'cursor', context);
  const [archive] = await snapshot(source, 'cursor', context);
  assert.ok(archive.startsWith(join(f.home, '.cursor/plugins/buddy-cli-backups') + '/'));
});

for (const entry of [
  { name: 'ownership marker', path: '.buddy-cli-owned.json', module: 'snapshot.ts', fn: 'snapshotSource', expected: 'unmanaged',
    args: (_root: string, home: string, data: string) => [{ home, data }, 'codex'] },
  { name: 'legacy catalog', path: '.agents/plugins/marketplace.json', module: 'native.ts', fn: 'localPlugin', expected: 'Cannot inspect native metadata',
    args: (root: string, _home: string, _data: string) => [{ name: 'buddy-local', local: root }, 'codex'] },
  { name: 'Cursor manifest', path: 'buddy/.cursor-plugin/plugin.json', module: 'native.ts', fn: 'verifyBuddyDirectory', expected: 'Cannot inspect native metadata',
    args: (root: string, _home: string, _data: string) => [join(root, 'buddy'), 'cursor'] },
]) test(`discovery rejects a FIFO ${entry.name} without blocking on a read`, async t => {
  const f = await fixture(t);
  await snapshot({ kind: 'local', path: f.source }, 'codex', f.context);
  const root = snapshotPath(f.context, 'codex');
  const file = join(root, entry.path);
  await rm(file);
  assert.equal(spawnSync('mkfifo', [file], { timeout: 1000 }).status, 0);
  const module = fileURLToPath(new URL('../src/' + entry.module, import.meta.url));
  const script = `import * as api from ${JSON.stringify(module)};
    const target = api[${JSON.stringify(entry.fn)}];
    if (typeof target !== 'function') throw new Error('Missing public function');
    try { await target(...${JSON.stringify(entry.args(root, f.home, f.context.data))}); process.exitCode = 1; }
    catch (error) { if (!error.message.includes(${JSON.stringify(entry.expected)})) throw error; }`;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test('snapshot includes untracked files, excludes ignored/dependency content, and removes stale files on refresh', async t => {
  const f = await fixture(t);
  await put(f.source, 'untracked.txt', 'included\n');
  await put(f.source, 'ignored.txt', 'ignored\n');
  await put(f.source, '.ai/private.txt', 'private\n');
  await put(f.source, 'node_modules/dependency/index.js', 'excluded\n');
  await put(f.source, 'cli/source.ts', 'excluded\n');
  const source = { kind: 'local' as const, path: f.source };
  await checkout(f.source, f.context);
  await snapshot(source, 'codex', f.context);
  const root = snapshotPath(f.context, 'codex');
  assert.equal(await assertOwned(root, f.context, 'codex', f.source), true);
  assert.equal(await readFile(join(root, 'buddy/untracked.txt'), 'utf8'), 'included\n');
  for (const path of ['ignored.txt', '.ai', 'node_modules', 'cli', '.git']) await assert.rejects(lstat(join(root, 'buddy', path)), { code: 'ENOENT' });
  await rm(join(f.source, 'untracked.txt'));
  await snapshot(source, 'codex', f.context);
  await assert.rejects(lstat(join(root, 'buddy/untracked.txt')), { code: 'ENOENT' });
});

for (const { operation, displace } of [
  { operation: 'refresh', displace: async ({ context, source }: Awaited<ReturnType<typeof fixture>>) =>
    (await snapshot({ kind: 'local', path: source }, 'cursor', context))[0] },
  { operation: 'uninstall', displace: ({ context, source }: Awaited<ReturnType<typeof fixture>>) =>
    removeSnapshot(context, 'cursor', source) },
]) test(`Cursor ${operation} archives the inode used by an open file handle`, async t => {
  const f = await fixture(t);
  const skill = 'skills/demo/SKILL.md';
  const root = snapshotPath(f.context, 'cursor');
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  const handle = await open(join(root, skill), 'r+');
  try {
    const archive = await displace(f);
    await handle.truncate(0);
    await handle.writeFile('late editor save\n');
    assert.ok(archive, 'the archive path must be reported');
    assert.ok(archive.startsWith(join(f.context.data, 'backups') + '/'));
    assert.equal(await readFile(join(archive, skill), 'utf8'), 'late editor save\n');
  } finally { await handle.close(); }
});

test('restoring a Cursor snapshot retains late writes to the displaced replacement', async t => {
  const f = await legacyCursor(t);
  const skill = 'skills/demo/SKILL.md';
  const adoption = await adoptCursor(f.context, f.source);
  assert.ok(adoption);
  await put(f.source, skill, 'replacement\n');
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  const handle = await open(join(f.local, skill), 'r+');
  try {
    const archive = await restoreSnapshot(f.context, 'cursor', f.source, adoption.backup);
    await handle.truncate(0);
    await handle.writeFile('late editor save\n');
    assert.ok(archive);
    assert.equal(await readFile(join(archive, skill), 'utf8'), 'late editor save\n');
    assert.match(await readFile(join(f.local, skill), 'utf8'), /Before/);
  } finally { await handle.close(); }
});

test('a Git-ignored manifest cannot replace an existing snapshot', async t => {
  const f = await fixture(t);
  const source = { kind: 'local' as const, path: f.source };
  const root = snapshotPath(f.context, 'cursor');
  await snapshot(source, 'cursor', f.context);
  const inode = (await lstat(root)).ino;
  await put(f.source, '.gitignore', '.codex-plugin/plugin.json\n');
  await checkout(f.source, f.context);
  await assert.rejects(snapshot(source, 'cursor', f.context), /Missing Buddy manifest.*\.codex-plugin\/plugin\.json/);
  assert.equal((await lstat(root)).ino, inode);
  await assert.rejects(lstat(join(f.context.data, 'backups')), { code: 'ENOENT' });
});

test('a Git-ignored manifest leaves a legacy Cursor installation unmarked and in place', async t => {
  const f = await legacyCursor(t);
  const inode = (await lstat(f.local)).ino;
  await put(f.source, '.gitignore', '.codex-plugin/plugin.json\n');
  const [result] = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  assert.equal(result.status, 'error');
  assert.match(result.message, /Missing Buddy manifest/);
  assert.equal((await lstat(f.local)).ino, inode);
  await assert.rejects(lstat(join(f.local, '.buddy-cli-owned.json')), { code: 'ENOENT' });
  await assert.rejects(lstat(join(f.context.data, 'backups')), { code: 'ENOENT' });
});

test('a failed Cursor adoption promotion removes the marker without replacing the original inode', async t => {
  const f = await legacyCursor(t);
  const inode = (await lstat(f.local)).ino;
  const original = fsPromises.rename;
  t.mock.method(fsPromises, 'rename', async (...args: Parameters<typeof original>) => {
    if (String(args[0]).includes('/.buddy-stage-') && args[1] === f.local) throw new Error('promotion failed');
    return original(...args);
  });
  syncBuiltinESMExports();
  try {
    await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', f.context, { adoptExistingCursor: true }), /promotion failed/);
  } finally { t.mock.restoreAll(); syncBuiltinESMExports(); }
  assert.equal((await lstat(f.local)).ino, inode);
  await assert.rejects(lstat(join(f.local, '.buddy-cli-owned.json')), { code: 'ENOENT' });
});

test('a staged manifest version mismatch cannot be published', async t => {
  const f = await fixture(t);
  const source = { kind: 'local' as const, path: f.source };
  await put(f.source, '.codex-plugin/plugin.json', '{"name":"buddy","version":"1.0.1"}\n');
  await assert.rejects(snapshot(source, 'codex', f.context), /manifest versions differ/);
  await assert.rejects(lstat(snapshotPath(f.context, 'codex')), { code: 'ENOENT' });
});

test('a staged version must match the version verified before staging', async t => {
  const f = await fixture(t);
  const source = { kind: 'local' as const, path: f.source };
  await assert.rejects(snapshot(source, 'codex', f.context, { expectedVersion: '0.9.0' }), /manifest versions changed during staging/);
  await assert.rejects(lstat(snapshotPath(f.context, 'codex')), { code: 'ENOENT' });
});

test('a missing snapshot repair cannot replace a reappeared managed snapshot', async t => {
  const f = await fixture(t);
  const source = { kind: 'local' as const, path: f.source };
  const root = snapshotPath(f.context, 'codex');
  await snapshot(source, 'codex', f.context);
  const inode = (await lstat(root)).ino;
  await assert.rejects(snapshot(source, 'codex', f.context, { requireAbsent: true }), /reappeared before repair/);
  assert.equal((await lstat(root)).ino, inode);
});

test('a snapshot remains active when its archive directory cannot be used', async t => {
  const f = await fixture(t);
  const source = { kind: 'local' as const, path: f.source };
  const root = snapshotPath(f.context, 'cursor');
  await snapshot(source, 'cursor', f.context);
  const inode = (await lstat(root)).ino;
  await mkdir(f.context.data, { recursive: true });
  await symlink(f.root, join(f.context.data, 'backups'));
  await assert.rejects(snapshot(source, 'cursor', f.context), /without symlinks/);
  assert.equal((await lstat(root)).ino, inode);
});

test('an unmanaged Cursor folder is preserved', async t => {
  const f = await fixture(t);
  const root = snapshotPath(f.context, 'cursor');
  await put(root, 'personal.txt', 'keep\n');
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', f.context), /unmanaged folder/);
  assert.equal(await readFile(join(root, 'personal.txt'), 'utf8'), 'keep\n');
});

test('edited snapshots cannot be refreshed or removed', async t => {
  const f = await fixture(t);
  const root = snapshotPath(f.context, 'cursor');
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  await put(root, 'skills/demo/SKILL.md', 'personal edit\n');
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', f.context), /contents changed/);
  await assert.rejects(removeSnapshot(f.context, 'cursor', f.source), /contents changed/);
  assert.equal(await readFile(join(root, 'skills/demo/SKILL.md'), 'utf8'), 'personal edit\n');
});

test('a source symlink cannot copy content outside the checkout or replace a valid snapshot', async t => {
  const f = await fixture(t);
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  await put(f.root, 'outside.txt', 'outside\n');
  await symlink(join(f.root, 'outside.txt'), join(f.source, 'linked.txt'));
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', f.context), /symlink/);
  assert.equal(await assertOwned(snapshotPath(f.context, 'cursor'), f.context, 'cursor', f.source), true);
});

test('snapshot destinations that overlap the checkout fail before creating folders', async t => {
  const f = await fixture(t);
  const context = { ...f.context, data: join(f.source, 'unsafe') };
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'codex', context), /overlap/);
  await assert.rejects(lstat(context.data), { code: 'ENOENT' });
});

test('a destination symlink cannot redirect snapshot ownership', async t => {
  const f = await fixture(t);
  const root = snapshotPath(f.context, 'cursor');
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  const elsewhere = join(f.root, 'saved-snapshot');
  const { rename } = await import('node:fs/promises');
  await rename(root, elsewhere);
  await symlink(elsewhere, root);
  await assert.rejects(removeSnapshot(f.context, 'cursor', f.source), /symlink/);
  assert.equal(await assertOwned(elsewhere, f.context, 'cursor', f.source), true);
});

test('a non-Buddy checkout is rejected before snapshot use', async t => {
  const f = await fixture(t);
  await put(f.source, '.codex-plugin/plugin.json', '{"name":"other","version":"1.0.0"}\n');
  await assert.rejects(checkout(f.source, f.context), /not a valid Buddy/);
  await mkdir(join(f.source, 'nested'));
  await assert.rejects(checkout(join(f.source, 'nested'), f.context), /root of a Buddy/);
});

test('a symlinked parent cannot redirect creation of a new snapshot', async t => {
  const f = await fixture(t);
  const redirected = join(f.root, 'redirected');
  await mkdir(redirected);
  await symlink(redirected, join(f.home, '.cursor'));
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', f.context), /symlinks/);
  await assert.rejects(lstat(join(redirected, 'plugins')), { code: 'ENOENT' });
});

test('independent manager homes cannot replace or remove each other’s Cursor snapshot', async t => {
  const f = await fixture(t);
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  const second = { ...f.context, data: join(f.home, '.second-manager') };
  await assert.rejects(snapshot({ kind: 'local', path: f.source }, 'cursor', second), /ownership/);
  await assert.rejects(removeSnapshot(second, 'cursor', f.source), /ownership/);
  const release = await lockCursor(f.context);
  await assert.rejects(lockCursor(second), /Cursor snapshot lock/);
  await release();
  assert.equal(await assertOwned(snapshotPath(f.context, 'cursor'), f.context, 'cursor', f.source), true);
});

for (const { name, tamper } of [
  { name: 'empty directories', tamper: async (root: string) => { await mkdir(join(root, 'added-directory')); } },
  { name: 'merged file records', tamper: async (root: string) => {
    await put(root, 'a', 'Ab\x00420\x00B');
    await rm(join(root, 'b'));
  } },
]) test(`ownership digest detects ${name}`, async t => {
  const f = await fixture(t);
  await put(f.source, 'a', 'A');
  await put(f.source, 'b', 'B');
  await snapshot({ kind: 'local', path: f.source }, 'cursor', f.context);
  await tamper(snapshotPath(f.context, 'cursor'));
  await assert.rejects(removeSnapshot(f.context, 'cursor', f.source), /contents changed/);
});
