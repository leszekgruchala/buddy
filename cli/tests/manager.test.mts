import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, lstat, mkdir, readdir, rm, symlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { manage } from '../src/manager.ts';
import { loadState, lock } from '../src/storage.ts';
import { snapshotPath } from '../src/snapshot.ts';
import { fixture, legacyCursor, legacyMarketplace, put } from './helpers.ts';

test('dry-run local installation invokes no processes and creates no state', async t => {
  const f = await fixture(t);
  const result = await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source, dryRun: true });
  assert.equal(result[0].status, 'planned');
  assert.equal(f.native.calls.length, 0);
  await assert.rejects(lstat(f.context.data), { code: 'ENOENT' });
});

test('local update keeps its checkout and refreshes Codex without uninstall', async t => {
  const f = await fixture(t);
  assert.equal((await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source }))[0].status, 'ok');
  await put(f.source, 'skills/demo/SKILL.md', 'Updated\n');
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'update', agents: ['codex'] });
  assert.equal(result[0].status, 'ok');
  assert.deepEqual(result[0].source, { kind: 'local', path: f.source });
  assert.equal(await readFile(join(snapshotPath(f.context, 'codex'), 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Updated\n');
  assert.deepEqual(f.native.mutations().map(c => c.args), [['plugin', 'add', 'buddy@buddy-local', '--json']]);
});

test('Claude local refresh changes files in place without an uninstall or reinstall', async t => {
  const f = await fixture(t);
  assert.equal((await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source }))[0].status, 'ok');
  await put(f.source, 'skills/demo/SKILL.md', 'Refreshed in place\n');
  f.native.calls = [];
  assert.equal((await manage(f.context, { operation: 'update', agents: ['claude'] }))[0].status, 'ok');
  assert.deepEqual(f.native.mutations(), []);
  assert.equal(await readFile(join(snapshotPath(f.context, 'claude'), 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Refreshed in place\n');
});

test('existing GitHub installation can update without prior manager state', async t => {
  const f = await fixture(t);
  f.native.seed('codex');
  assert.equal((await manage(f.context, { operation: 'update', agents: ['codex'] }))[0].status, 'ok');
  assert.deepEqual(f.native.mutations().map(c => c.args), [['plugin', 'marketplace', 'upgrade', 'buddy', '--json']]);
  assert.deepEqual((await loadState(f.context.data)).targets.codex?.source, { kind: 'github' });
});

test('a different marketplace source fails before native changes', async t => {
  const f = await fixture(t);
  f.native.seed('claude', 'someone/another-plugin');
  const result = await manage(f.context, { operation: 'install', agents: ['claude'] });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /different or unverified source/);
  assert.deepEqual(f.native.mutations(), []);
});

test('a Claude installation in another scope cannot be removed by the user-scope manager', async t => {
  const f = await fixture(t);
  f.native.seed('claude');
  f.native.plugins.claude[0].scope = 'project';
  const result = await manage(f.context, { operation: 'uninstall', agents: ['claude'] });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /source\/scope/);
  assert.deepEqual(f.native.mutations(), []);
});

test('native success without installed readback cannot be saved as success', async t => {
  const f = await fixture(t);
  const run = f.context.run;
  f.context.run = async cmd => cmd.args[1] === 'add' && !cmd.args.includes('--help')
    ? { code: 0, stdout: '{}', stderr: '' } : run(cmd);
  const result = await manage(f.context, { operation: 'install', agents: ['codex'] });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /not listed as installed/);
  assert.equal((await loadState(f.context.data)).targets.codex, undefined);
});

test('source switching refuses to discard an existing local installation', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'install', agents: ['codex'], from: 'github' });
  assert.equal(result[0].status, 'needs-action');
  assert.match(result[0].message, /different source/);
  assert.match(result[0].actions.join(' '), /--migrate/);
  assert.deepEqual(f.native.mutations(), []);
});

for (const { agent, name, direct } of [
  { agent: 'codex' as const, name: 'buddy-local', direct: false },
  { agent: 'claude' as const, name: 'buddy', direct: true },
]) test(`${agent} adopts an existing local ${name} installation without uninstalling it`, async t => {
  const f = await fixture(t);
  const root = direct ? f.source : join(f.home, 'legacy-market');
  const folder = await legacyMarketplace(f.source, root, agent, name);
  f.native.markets[agent] = [{ name, source: 'directory', path: root }];
  f.native.plugins[agent] = [{ id: `buddy@${name}`, version: '1.0.0', enabled: true, scope: 'user', readFromFolder: folder }];
  await put(f.source, 'skills/demo/SKILL.md', 'Fresh local content\n');
  const result = await manage(f.context, { operation: 'install', agents: [agent], from: f.source });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.equal(f.native.plugins[agent][0].id, `buddy@${name}`);
  assert.equal((await loadState(f.context.data)).targets[agent]?.marketplace, name);
  assert.equal((await lstat(root)).isDirectory(), true);
  assert.equal(f.native.mutations().some(cmd => cmd.args[1] === 'uninstall' || cmd.args[1] === 'remove'), false);
  assert.equal((await manage(f.context, { operation: 'update', agents: [agent] }))[0].status, 'ok');
  assert.equal(await readFile(join(snapshotPath(f.context, agent), 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Fresh local content\n');
});

test('Codex restores the old local registration when replacement fails', async t => {
  const f = await fixture(t);
  const root = join(f.home, 'legacy-market');
  await legacyMarketplace(f.source, root, 'codex');
  f.native.markets.codex = [{ name: 'buddy-local', source: 'directory', path: root }];
  f.native.plugins.codex = [{ id: 'buddy@buddy-local', version: '1.0.0', enabled: true, scope: 'user' }];
  f.native.fail = cmd => cmd.args[1] === 'marketplace' && cmd.args[2] === 'add' && cmd.args[3] === snapshotPath(f.context, 'codex');
  const result = await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  assert.equal(result[0].status, 'error');
  assert.equal(f.native.markets.codex[0].path, root);
  assert.equal((await loadState(f.context.data)).targets.codex, undefined);
  assert.match(result[0].actions.join(' '), /previous marketplace registration was restored/);
  await assert.rejects(lstat(snapshotPath(f.context, 'codex')), { code: 'ENOENT' });
  f.native.fail = undefined;
  assert.equal((await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source }))[0].status, 'ok');
});

test('a copied legacy source asks for a checkout instead of inventing update provenance', async t => {
  const f = await fixture(t);
  const root = join(f.home, 'legacy-market');
  await legacyMarketplace(f.source, root, 'codex');
  f.native.markets.codex = [{ name: 'buddy-local', source: 'directory', path: root }];
  f.native.plugins.codex = [{ id: 'buddy@buddy-local', version: '1.0.0', enabled: true, scope: 'user' }];
  const result = await manage(f.context, { operation: 'update', agents: ['codex'] });
  assert.equal(result[0].status, 'needs-action');
  assert.match(result[0].message, /--from/);
  assert.deepEqual(f.native.mutations(), []);
});

test('an explicit GitHub to local migration preserves the installed identity', async t => {
  const f = await fixture(t);
  f.native.seed('claude');
  const refused = await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  assert.equal(refused[0].status, 'needs-action');
  assert.deepEqual(f.native.mutations(), []);
  const migrated = await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source, migrate: true });
  assert.equal(migrated[0].status, 'ok', migrated[0].message);
  assert.equal(f.native.plugins.claude[0].id, 'buddy@buddy');
  assert.equal(f.native.mutations().some(cmd => cmd.args[1] === 'install' || cmd.args[1] === 'uninstall'), false);
  assert.equal((await manage(f.context, { operation: 'update', agents: ['claude'] }))[0].status, 'ok');
});

test('a direct local checkout can update without prior CLI state', async t => {
  const f = await fixture(t);
  const folder = await legacyMarketplace(f.source, f.source, 'claude', 'buddy');
  f.native.markets.claude = [{ name: 'buddy', source: 'directory', path: f.source }];
  f.native.plugins.claude = [{ id: 'buddy@buddy', version: '1.0.0', enabled: true, scope: 'user', readFromFolder: folder }];
  const result = await manage(f.context, { operation: 'update', agents: ['claude'] });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.deepEqual((await loadState(f.context.data)).targets.claude?.source, { kind: 'local', path: f.source });
});

test('adoption refuses marketplaces that also contain another plugin', async t => {
  const f = await fixture(t);
  await legacyMarketplace(f.source, f.source, 'claude', 'buddy');
  await put(f.source, '.claude-plugin/marketplace.json', JSON.stringify({ name: 'buddy', plugins: [{ name: 'buddy', source: './' }, { name: 'other', source: './other' }] }));
  f.native.markets.claude = [{ name: 'buddy', source: 'directory', path: f.source }];
  f.native.plugins.claude = [{ id: 'buddy@buddy', version: '1.0.0', enabled: true, scope: 'user', readFromFolder: f.source }];
  assert.equal((await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source }))[0].status, 'error');
  assert.deepEqual(f.native.mutations(), []);
});

test('a failed checkout migration restores the old snapshot and keeps its source record', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  const { cp } = await import('node:fs/promises');
  const next = join(f.root, 'next-checkout');
  await cp(f.source, next, { recursive: true });
  await put(next, 'skills/demo/SKILL.md', 'New checkout\n');
  f.native.fail = cmd => cmd.args[1] === 'add' && !cmd.args.includes('--help');
  const result = await manage(f.context, { operation: 'install', agents: ['codex'], from: next, migrate: true });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].actions.join(' '), /previous local files were restored/);
  assert.match(result[0].message, /Active Codex cache recovery is incomplete/);
  assert.match(result[0].actions.join(' '), /codex plugin add buddy@buddy-local --json/);
  assert.deepEqual((await loadState(f.context.data)).targets.codex?.source, { kind: 'local', path: f.source });
  assert.match(await readFile(join(snapshotPath(f.context, 'codex'), 'buddy/skills/demo/SKILL.md'), 'utf8'), /Before/);
  f.native.fail = undefined;
  assert.equal((await manage(f.context, { operation: 'install', agents: ['codex'], from: next, migrate: true }))[0].status, 'ok');
  assert.deepEqual((await loadState(f.context.data)).targets.codex?.source, { kind: 'local', path: next });
});

test('update does not reinstall Buddy after an explicit uninstall', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'] });
  await manage(f.context, { operation: 'uninstall', agents: ['claude'] });
  f.native.calls = [];
  assert.equal((await manage(f.context, { operation: 'update', agents: ['claude'] }))[0].status, 'needs-action');
  assert.deepEqual(f.native.plugins.claude, []);
  assert.deepEqual(f.native.mutations(), []);
});

for (const { agent, initial, next, installed, dormant } of [
  { agent: 'codex' as const, initial: 'local', next: undefined, installed: 'buddy', dormant: 'buddy-local' },
  { agent: 'claude' as const, initial: undefined, next: 'local', installed: 'buddy-local', dormant: 'buddy' },
]) test(`${agent} uninstall removes the ${dormant} marketplace before a fresh ${installed} install`, async t => {
  const f = await fixture(t);
  assert.equal((await manage(f.context, { operation: 'install', agents: [agent], from: initial && f.source }))[0].status, 'ok');
  assert.equal((await manage(f.context, { operation: 'uninstall', agents: [agent] }))[0].status, 'ok');
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'install', agents: [agent], from: next && f.source });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.equal(f.native.plugins[agent][0].id, `buddy@${installed}`);
  assert.equal(f.native.markets[agent].some(market => market.name === dormant), false);
});

test('a local reinstall adopts the dormant buddy marketplace that still points at the managed Claude snapshot', async t => {
  const f = await fixture(t);
  f.native.seed('claude');
  assert.equal((await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source, migrate: true }))[0].status, 'ok');
  // Earlier CLI versions removed only the plugin and its state record.
  f.native.plugins.claude = [];
  await rm(join(f.context.data, 'state.json'));
  const result = await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.equal(f.native.plugins.claude[0].id, 'buddy@buddy');
  assert.deepEqual((await loadState(f.context.data)).targets.claude, { source: { kind: 'local', path: f.source }, version: f.native.plugins.claude[0].version, marketplace: 'buddy' });
});

test('an explicit install selects its source when a stale state record has no installed plugin', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  f.native.plugins.claude = [];
  const [result] = await manage(f.context, { operation: 'install', agents: ['claude'] });
  assert.equal(result.status, 'ok', result.message);
  assert.equal(f.native.plugins.claude[0].id, 'buddy@buddy');
  assert.deepEqual((await loadState(f.context.data)).targets.claude?.source, { kind: 'github' });
});

test('a failed verification of an explicit Codex snapshot repair leaves no active replacement', async t => {
  const f = await fixture(t);
  const root = snapshotPath(f.context, 'codex');
  const install = () => manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  assert.equal((await install())[0].status, 'ok');
  await rm(root, { recursive: true });
  f.native.calls = [];
  f.context.run = async cmd => {
    if (cmd.bin === 'codex' && cmd.args[1] === 'marketplace' && cmd.args[2] === 'list'
      && await lstat(root).then(() => true, () => false)) return { code: 0, stdout: '{"marketplaces":[]}', stderr: '' };
    return f.native.run(cmd);
  };
  const [result] = await install();
  assert.equal(result.status, 'error');
  assert.match(result.message, /no verified marketplace/);
  assert.match(result.actions.join(' '), /repair was rolled back/);
  assert.deepEqual(f.native.mutations(), []);
  await assert.rejects(lstat(root), { code: 'ENOENT' });
  assert.deepEqual((await loadState(f.context.data)).targets.codex?.source, { kind: 'local', path: f.source });
});

test('old schema-1 GitHub state retains buddy identity during local migration and preview', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'] });
  await put(f.context.data, 'state.json', JSON.stringify({ schema: 1, targets: { claude: { source: { kind: 'github' } } } }));
  const preview = await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source, migrate: true, dryRun: true });
  assert.equal(preview[0].commands.some(cmd => cmd.args.includes('buddy-local')), false);
  const result = await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source, migrate: true });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.equal(f.native.plugins.claude[0].id, 'buddy@buddy');
});

test('old schema-1 local state still blocks an unsupported remote identity change', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  await put(f.context.data, 'state.json', JSON.stringify({ schema: 1, targets: { codex: { source: { kind: 'local', path: f.source } } } }));
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'install', agents: ['codex'], from: 'github', migrate: true });
  assert.equal(result[0].status, 'needs-action');
  assert.match(result[0].message, /identity/);
  assert.deepEqual(f.native.mutations(), []);
});

test('a second manager cannot adopt another manager’s native snapshot registration', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source });
  f.native.calls = [];
  const other = { ...f.context, data: join(f.home, 'other-manager') };
  const result = await manage(other, { operation: 'install', agents: ['codex'], from: f.source });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /already owned/);
  assert.deepEqual(f.native.mutations(), []);
  assert.equal((await manage(f.context, { operation: 'update', agents: ['codex'] }))[0].status, 'ok');
});

test('cancelling Codex after marketplace removal restores it through the cleanup runner', async t => {
  const f = await fixture(t);
  const root = join(f.home, 'legacy-market');
  await legacyMarketplace(f.source, root, 'codex');
  f.native.markets.codex = [{ name: 'buddy-local', source: 'directory', path: root }];
  f.native.plugins.codex = [{ id: 'buddy@buddy-local', version: '1.0.0', enabled: true, scope: 'user' }];
  const controller = new AbortController();
  const context = { ...f.context, signal: controller.signal, run: async (cmd: Parameters<typeof f.context.run>[0]) => {
    const result = await f.native.run(cmd);
    if (cmd.args[1] === 'marketplace' && cmd.args[2] === 'remove' && !cmd.args.includes('--help')) controller.abort();
    return result;
  } };
  const result = await manage(context, { operation: 'install', agents: ['codex'], from: f.source });
  assert.equal(result[0].status, 'error');
  assert.equal(f.native.markets.codex[0].path, root);
  assert.match(result[0].actions.join(' '), /previous marketplace registration was restored/);
});

test('a symlinked legacy marketplace root cannot be adopted', async t => {
  const f = await fixture(t);
  const root = join(f.home, 'legacy-market');
  await legacyMarketplace(f.source, root, 'codex');
  const linked = join(f.home, 'linked-market');
  await symlink(root, linked);
  f.native.markets.codex = [{ name: 'buddy-local', source: 'directory', path: linked }];
  f.native.plugins.codex = [{ id: 'buddy@buddy-local', version: '1.0.0', enabled: true, scope: 'user' }];
  assert.equal((await manage(f.context, { operation: 'install', agents: ['codex'], from: f.source }))[0].status, 'error');
  assert.deepEqual(f.native.mutations(), []);
});

test('explicit migration reuses a verified dormant snapshot after a GitHub round trip', async t => {
  const f = await fixture(t);
  f.native.seed('claude');
  await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source, migrate: true });
  assert.equal((await manage(f.context, { operation: 'install', agents: ['claude'], from: 'github', migrate: true }))[0].status, 'ok');
  const { cp } = await import('node:fs/promises');
  const next = join(f.root, 'next-checkout');
  await cp(f.source, next, { recursive: true });
  await put(next, 'skills/demo/SKILL.md', 'Second checkout\n');
  const result = await manage(f.context, { operation: 'install', agents: ['claude'], from: next, migrate: true });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.equal(f.native.plugins.claude[0].id, 'buddy@buddy');
  assert.equal(await readFile(join(snapshotPath(f.context, 'claude'), 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Second checkout\n');
  assert.deepEqual((await loadState(f.context.data)).targets.claude?.source, { kind: 'local', path: next });
});

test('a discovered direct checkout rejects a FIFO in another harness manifest without holding its lock', async t => {
  const f = await fixture(t);
  await legacyMarketplace(f.source, f.source, 'claude', 'buddy');
  const file = join(f.source, '.codex-plugin/plugin.json');
  await rm(file);
  assert.equal(spawnSync('mkfifo', [file], { timeout: 1000 }).status, 0);
  const helpers = fileURLToPath(new URL('./helpers.ts', import.meta.url));
  const manager = fileURLToPath(new URL('../src/manager.ts', import.meta.url));
  const processModule = fileURLToPath(new URL('../src/process.ts', import.meta.url));
  const script = `import { FakeNative } from ${JSON.stringify(helpers)};
    import { manage } from ${JSON.stringify(manager)};
    import { runner } from ${JSON.stringify(processModule)};
    const native = new FakeNative(runner());
    native.markets.claude = [{ name: 'buddy', source: 'directory', path: ${JSON.stringify(f.source)} }];
    native.plugins.claude = [{ id: 'buddy@buddy', version: '1.0.0', enabled: true, scope: 'user', readFromFolder: ${JSON.stringify(f.source)} }];
    const context = { home: ${JSON.stringify(f.home)}, data: ${JSON.stringify(f.context.data)}, run: native.run, cleanupRun: native.run };
    const result = await manage(context, { operation: 'update', agents: ['claude'] });
    if (result[0].status !== 'error' || !result[0].message.includes('regular JSON file')) throw new Error(JSON.stringify(result));`;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  await assert.rejects(lstat(join(f.context.data, 'lock')), { code: 'ENOENT' });
});

test('Cursor local to GitHub migration registers the remote marketplace and returns its real UI steps', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'install', agents: ['cursor'], from: 'github', migrate: true });
  assert.equal(result[0].status, 'needs-action');
  assert.deepEqual(f.native.mutations()[0].args, ['plugin', 'marketplace', 'add', 'https://github.com/leszekgruchala/buddy', '--git-ref', 'main']);
  assert.match(result[0].actions.join(' '), /native UI/);
  assert.deepEqual((await loadState(f.context.data)).targets.cursor?.source, { kind: 'github' });
});

test('Cursor GitHub to local migration can attach an existing unmarked copy', async t => {
  const f = await legacyCursor(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'] });
  await put(f.source, 'skills/demo/SKILL.md', 'Attached checkout\n');
  const [result] = await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source, migrate: true });
  assert.equal(result.status, 'needs-action', result.message);
  assert.equal(await readFile(join(f.local, 'skills/demo/SKILL.md'), 'utf8'), 'Attached checkout\n');
  assert.deepEqual((await loadState(f.context.data)).targets.cursor?.source, { kind: 'local', path: f.source });
});

test('uninstall of an unrecorded local installation keeps the user marketplace and its directory', async t => {
  const f = await fixture(t);
  await legacyMarketplace(f.source, f.source, 'claude', 'buddy');
  f.native.markets.claude = [{ name: 'buddy', source: 'directory', path: f.source }];
  f.native.plugins.claude = [{ id: 'buddy@buddy', version: '1.0.0', enabled: true, scope: 'user', readFromFolder: f.source }];
  const result = await manage(f.context, { operation: 'uninstall', agents: ['claude'] });
  assert.equal(result[0].status, 'ok', result[0].message);
  assert.ok(result[0].actions.some(action => action.includes(f.source)));
  assert.equal(result[0].actions.some(action => action.includes(snapshotPath(f.context, 'claude'))), false);
  await assert.rejects(lstat(snapshotPath(f.context, 'claude')), { code: 'ENOENT' });
  assert.deepEqual(f.native.markets.claude, [{ name: 'buddy', source: 'directory', path: f.source }]);
});

test('checkout migration reports both its verified content copy and displaced original', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  const { cp } = await import('node:fs/promises');
  const next = join(f.root, 'next-checkout');
  await cp(f.source, next, { recursive: true });
  const result = await manage(f.context, { operation: 'install', agents: ['claude'], from: next, migrate: true });
  assert.equal(result[0].status, 'ok', result[0].message);
  const backups = await readdir(join(f.context.data, 'backups'));
  assert.equal(backups.length, 2);
  for (const path of backups) assert.ok(result[0].actions.some(action => action.includes(join(f.context.data, 'backups', path))));
});

test('one failed native install retains other targets and records no false success', async t => {
  const f = await fixture(t);
  f.native.fail = cmd => cmd.bin === 'codex' && cmd.args[1] === 'add' && !cmd.args.includes('--help');
  const results = await manage(f.context, { operation: 'install', agents: ['codex', 'claude'] });
  assert.deepEqual(results.map(r => r.status), ['error', 'ok']);
  assert.ok(results[0].commands.length > 0);
  const state = await loadState(f.context.data);
  assert.equal(state.targets.codex, undefined);
  assert.deepEqual(state.targets.claude?.source, { kind: 'github' });
});

test('Cursor reports manual plugin completion and never removes its shared marketplace', async t => {
  const f = await fixture(t);
  const installed = await manage(f.context, { operation: 'install', agents: ['cursor'] });
  assert.equal(installed[0].status, 'needs-action');
  assert.match(installed[0].message, /not verified/);
  f.native.calls = [];
  const removed = await manage(f.context, { operation: 'uninstall', agents: ['cursor'] });
  assert.equal(removed[0].status, 'needs-action');
  assert.deepEqual(f.native.mutations(), []);
  assert.equal((await loadState(f.context.data)).targets.cursor, undefined);
});

test('a local Cursor uninstall reports the archive that contains the removed plugin', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  const [result] = await manage(f.context, { operation: 'uninstall', agents: ['cursor'] });
  assert.equal(result.status, 'ok', result.message);
  const backupRoot = join(f.context.data, 'backups');
  const [backup] = await readdir(backupRoot);
  assert.ok(backup);
  assert.ok(result.actions.some(action => action.includes(join(backupRoot, backup))));
  await assert.rejects(lstat(snapshotPath(f.context, 'cursor')), { code: 'ENOENT' });
});

test('cancellation after a Cursor snapshot is archived restores the snapshot and prior state', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  const root = snapshotPath(f.context, 'cursor');
  const { signal } = new AbortController();
  Object.defineProperty(signal, 'aborted', { get: () => !existsSync(root) });
  const [result] = await manage({ ...f.context, signal }, { operation: 'uninstall', agents: ['cursor'] });
  assert.equal(result.status, 'error');
  assert.match(result.message, /cancelled/);
  assert.match(result.actions.join(' '), /previous local files were restored/);
  assert.match(await readFile(join(root, 'skills/demo/SKILL.md'), 'utf8'), /Before/);
  assert.deepEqual((await loadState(f.context.data)).targets.cursor?.source, { kind: 'local', path: f.source });
});

test('explicit local uninstall removes its marketplace and archives the managed snapshot', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  f.native.calls = [];
  const removed = await manage(f.context, { operation: 'uninstall', agents: ['claude'] });
  assert.equal(removed[0].status, 'ok');
  assert.deepEqual(f.native.mutations().map(c => c.args), [['plugin', 'uninstall', 'buddy@buddy-local', '--scope', 'user', '--keep-data', '--json'],
    ['plugin', 'marketplace', 'remove', 'buddy-local', '--scope', 'user', '--json']]);
  assert.deepEqual(f.native.markets.claude.filter(market => market.name.startsWith('buddy')), []);
  await assert.rejects(lstat(snapshotPath(f.context, 'claude')), { code: 'ENOENT' });
  assert.equal((await loadState(f.context.data)).targets.claude, undefined);
});

test('malformed saved state and a held lock cannot be silently replaced', async t => {
  const f = await fixture(t);
  const release = await lock(f.context);
  await assert.rejects(lock(f.context), /holds/);
  await release();
  await put(f.context.data, 'state.json', '{broken');
  await assert.rejects(manage(f.context, { operation: 'install', agents: ['codex'] }), /Cannot read Buddy CLI state/);
  assert.equal(await readFile(join(f.context.data, 'state.json'), 'utf8'), '{broken');
  assert.deepEqual(f.native.mutations(), []);
});

test('disabled native plugins are not enabled by update or repeated install', async t => {
  const f = await fixture(t);
  f.native.seed('codex');
  f.native.plugins.codex[0].enabled = false;
  assert.equal((await manage(f.context, { operation: 'update', agents: ['codex'] }))[0].status, 'needs-action');
  assert.equal((await manage(f.context, { operation: 'install', agents: ['codex'] }))[0].status, 'needs-action');
  assert.deepEqual(f.native.mutations(), []);
  assert.equal(f.native.plugins.codex[0].enabled, false);
});

test('an installed plugin with a missing marketplace cannot be uninstalled from a saved source', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'] });
  f.native.markets.claude = [];
  f.native.calls = [];
  const result = await manage(f.context, { operation: 'uninstall', agents: ['claude'] });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /no verified marketplace/);
  assert.deepEqual(f.native.mutations(), []);
});

test('cancellation prevents later targets from removing a local Cursor snapshot', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'], from: f.source });
  f.native.seed('codex');
  const controller = new AbortController();
  const run = f.context.run;
  const context = { ...f.context, signal: controller.signal, run: async (cmd: Parameters<typeof run>[0]) => {
    const result = await run(cmd);
    if (cmd.bin === 'codex' && cmd.args[1] === 'list') controller.abort();
    return result;
  } };
  const results = await manage(context, { operation: 'uninstall', agents: ['codex', 'cursor'] });
  assert.deepEqual(results.map(result => result.status), ['error', 'error']);
  assert.equal((await lstat(snapshotPath(f.context, 'cursor'))).isDirectory(), true);
});

test('a failed state save does not leak its candidate into the next target commit', async t => {
  const f = await fixture(t);
  const run = f.context.run;
  f.context.run = async cmd => {
    if (cmd.bin === 'claude' && cmd.args[1] === 'list') await rm(join(f.context.data, 'state.json'), { recursive: true, force: true });
    const result = await run(cmd);
    if (cmd.bin === 'codex' && cmd.args[1] === 'add' && !cmd.args.includes('--help')) await mkdir(join(f.context.data, 'state.json'));
    return result;
  };
  const results = await manage(f.context, { operation: 'install', agents: ['codex', 'claude'] });
  assert.deepEqual(results.map(result => result.status), ['error', 'ok']);
  const state = await loadState(f.context.data);
  assert.equal(state.targets.codex, undefined);
  assert.ok(state.targets.claude);
});

test('Cursor refresh names the canonical repository rather than an account display name', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['cursor'] });
  f.native.calls = [];
  await manage(f.context, { operation: 'update', agents: ['cursor'] });
  assert.deepEqual(f.native.mutations()[0].args, ['plugin', 'marketplace', 'update', 'https://github.com/leszekgruchala/buddy']);
});

test('uninstall previews explain removal and Claude options loss', async t => {
  const f = await fixture(t);
  const claude = await manage(f.context, { operation: 'uninstall', agents: ['claude'], dryRun: true });
  assert.match(claude[0].actions.join(' '), /options\/secrets/);
  const cursor = await manage(f.context, { operation: 'uninstall', agents: ['cursor'], dryRun: true });
  assert.match(cursor[0].actions.join(' '), /Remove Buddy/);
  assert.doesNotMatch(cursor[0].actions.join(' '), /install or re-add/);
  assert.equal((await manage(f.context, { operation: 'uninstall', agents: ['cursor'] }))[0].status, 'needs-action');
});

test('Claude doctor reads metadata without calling plugin list or creating a config directory', async t => {
  const f = await fixture(t);
  assert.equal((await manage(f.context, { operation: 'doctor', agents: ['claude'] }))[0].status, 'ok');
  assert.equal(f.native.calls.some(cmd => cmd.bin === 'claude' && cmd.args.includes('plugin')), false);
  await assert.rejects(lstat(join(f.home, '.claude')), { code: 'ENOENT' });
});

for (const { label, relative, error } of [
  { label: 'Buddy state', relative: '.buddy/cli/state.json', error: 'Cannot read Buddy CLI state' },
  { label: 'Claude installed plugins', relative: '.claude/plugins/installed_plugins.json', error: 'installed_plugins.json' },
  { label: 'Claude marketplaces', relative: '.claude/plugins/known_marketplaces.json', error: 'known_marketplaces.json' },
  { label: 'Claude settings symlink target', relative: '.claude/settings-target.json', error: 'settings.json' },
]) test(`doctor rejects a FIFO in ${label} without blocking the process`, async t => {
  const f = await fixture(t);
  const path = join(f.home, relative);
  await mkdir(dirname(path), { recursive: true });
  assert.equal(spawnSync('mkfifo', [path], { timeout: 1000 }).status, 0);
  if (relative.endsWith('settings-target.json')) await symlink(path, join(f.home, '.claude/settings.json'));
  const manager = fileURLToPath(new URL('../src/manager.ts', import.meta.url));
  const script = `import { doctor } from ${JSON.stringify(manager)};
    const run = async () => ({ code: 0, stdout: '2.1.322', stderr: '' });
    const context = { home: ${JSON.stringify(f.home)}, data: ${JSON.stringify(f.context.data)}, run, cleanupRun: run };
    const [result] = await doctor(context, ['claude']);
    if (result.status !== 'error' || !result.message.includes(${JSON.stringify(error)})) throw new Error(JSON.stringify(result));`;
  const result = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.ok((await lstat(path)).isFIFO());
});

test('Claude doctor checks the same effective local folder as update', async t => {
  const f = await fixture(t);
  await manage(f.context, { operation: 'install', agents: ['claude'], from: f.source });
  const root = snapshotPath(f.context, 'claude');
  const alternate = join(f.root, 'other-market');
  await put(alternate, '.claude-plugin/marketplace.json', JSON.stringify({plugins:[{name:'buddy',source:'./buddy'}]}));
  await put(alternate, 'buddy/.claude-plugin/plugin.json', '{"name":"buddy","version":"1.0.0"}');
  const config = join(f.home, '.claude');
  await put(config, 'plugins/installed_plugins.json', JSON.stringify({version:2,plugins:{'buddy@buddy-local':[{scope:'user',version:'1.0.0'}]}}));
  await put(config, 'plugins/known_marketplaces.json', JSON.stringify({'buddy-local':{source:{source:'directory',path:root},installLocation:alternate}}));
  const result = await manage(f.context, { operation: 'doctor', agents: ['claude'] });
  assert.equal(result[0].status, 'error');
  assert.match(result[0].message, /not reading the managed snapshot/);
});

test('doctor shares one deadline across probes and retains other harness results in order', async t => {
  const f = await fixture(t);
  let codexVersionFinished = false;
  const otherStarts: boolean[] = [];
  let stalledSignal: AbortSignal | undefined;
  f.context.run = async cmd => {
    if (cmd.bin === 'codex' && cmd.args[0] === '--version') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      codexVersionFinished = true;
    } else if (cmd.args[0] === '--version' && (cmd.bin === 'claude' || cmd.bin === 'cursor-agent')) {
      otherStarts.push(!codexVersionFinished);
    }
    if (cmd.bin === 'codex' && cmd.args[0] === 'plugin' && cmd.args[1] === 'list') {
      stalledSignal = cmd.signal;
      return new Promise((resolve, reject) => {
        const fallback = setTimeout(() => resolve({ code: 0, stdout: '{"installed":[]}', stderr: '' }), 6000);
        cmd.signal?.addEventListener('abort', () => { clearTimeout(fallback); reject(new Error('probe aborted')); }, { once: true });
      });
    }
    return f.native.run(cmd);
  };
  const started = performance.now();
  const results = await manage(f.context, { operation: 'doctor', agents: ['codex', 'claude', 'cursor'] });
  assert.ok(performance.now() - started < 5_200, 'A later probe received a fresh timeout instead of the remaining budget');
  assert.deepEqual(otherStarts, [true, true]);
  assert.deepEqual(results.map(result => [result.agent, result.status]), [['codex', 'error'], ['claude', 'ok'], ['cursor', 'needs-action']]);
  assert.match(results[0].message, /timed out.*codex plugin list --json/);
  assert.equal(stalledSignal?.aborted, true);
  await assert.rejects(lstat(f.context.data), { code: 'ENOENT' });
});
