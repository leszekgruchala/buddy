import assert from 'node:assert/strict';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { manage } from '../src/manager.ts';
import { loadState } from '../src/storage.ts';
import type { Runner } from '../src/types.ts';
import { legacyMarketplace, nativeHarness, put } from './helpers.ts';

test('real Codex adopts an existing copied local marketplace and keeps its identity and original files', async t => {
  const f = await nativeHarness(t);
  const legacy = join(f.env.CODEX_HOME, 'buddy-local');
  const oldPlugin = await legacyMarketplace(f.source, legacy, 'codex');
  assert.equal(f.native('codex', ['plugin', 'marketplace', 'add', legacy, '--json']).status, 0);
  assert.equal(f.native('codex', ['plugin', 'add', 'buddy@buddy-local', '--json']).status, 0);
  assert.equal(f.cli(['doctor', '--agent', 'codex'], 2).results[0].source.kind, 'local');
  await put(f.source, 'skills/demo/SKILL.md', 'Adopted source\n');
  f.cli(['install', '--agent', 'codex', '--from', f.source]);
  const markets: { name: string; marketplaceSource: { source: string } }[] = JSON.parse(f.native('codex', ['plugin', 'marketplace', 'list', '--json']).stdout).marketplaces;
  assert.equal(markets.find(row => row.name === 'buddy-local')?.marketplaceSource.source, join(f.context.data, 'snapshots/codex'));
  const cache = join(f.env.CODEX_HOME, 'plugins/cache/buddy-local/buddy/1.0.0');
  assert.equal(await readFile(join(cache, 'skills/demo/SKILL.md'), 'utf8'), 'Adopted source\n');
  assert.match(await readFile(join(oldPlugin, 'skills/demo/SKILL.md'), 'utf8'), /Before/);
  f.cli(['update', '--agent', 'codex']);
  assert.equal(JSON.parse(f.native('codex', ['plugin', 'list', '--json']).stdout).installed[0].pluginId, 'buddy@buddy-local');
});

test('real Codex refreshes a same-version local plugin and removes stale files in an isolated home', async t => {
  const f = await nativeHarness(t);
  await put(f.source, 'stale.txt', 'remove on refresh\n');
  f.cli(['install', '--agent', 'codex', '--from', f.source]);
  const cache = join(f.env.CODEX_HOME, 'plugins/cache/buddy-local/buddy/1.0.0');
  assert.match(await readFile(join(cache, 'skills/demo/SKILL.md'), 'utf8'), /Before/);
  await put(f.source, 'skills/demo/SKILL.md', 'Changed at the same version\n');
  await rm(join(f.source, 'stale.txt'));
  f.cli(['update', '--agent', 'codex']);
  assert.equal(await readFile(join(cache, 'skills/demo/SKILL.md'), 'utf8'), 'Changed at the same version\n');
  await assert.rejects(readFile(join(cache, 'stale.txt')), { code: 'ENOENT' });
  const config = join(f.env.CODEX_HOME, 'config.toml');
  const enabled = await readFile(config, 'utf8');
  const disabled = enabled.replace('enabled = true', 'enabled = false');
  assert.notEqual(disabled, enabled);
  await writeFile(config, disabled);
  assert.equal(f.cli(['update', '--agent', 'codex'], 2).results[0].status, 'needs-action');
  assert.equal(await readFile(config, 'utf8'), disabled);
  f.cli(['uninstall', '--agent', 'codex']);
  await assert.rejects(readFile(join(cache, 'skills/demo/SKILL.md')), { code: 'ENOENT' });
});

test('failed migration restores the real Codex cache after a same-version native add', async t => {
  const f = await nativeHarness(t);
  f.cli(['install', '--agent', 'codex', '--from', f.source]);
  const next = join(f.root, 'new-checkout');
  await cp(f.source, next, { recursive: true });
  await put(next, 'skills/demo/SKILL.md', 'New checkout at the same version\n');
  const cache = join(f.env.CODEX_HOME, 'plugins/cache/buddy-local/buddy/1.0.0/skills/demo/SKILL.md');
  const native: Runner = async cmd => {
    if (cmd.bin === 'git') return f.context.run(cmd);
    const result = f.native(cmd.bin, cmd.args);
    return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
  };
  let added = false;
  const interrupted: Runner = async cmd => {
    if (added && cmd.bin === 'codex' && cmd.args[1] === 'list') {
      assert.equal(await readFile(cache, 'utf8'), 'New checkout at the same version\n');
      return { code: 1, stdout: '', stderr: 'Injected native readback failure' };
    }
    const result = await native(cmd);
    if (cmd.bin === 'codex' && cmd.args[1] === 'add' && !cmd.args.includes('--help') && result.code === 0) added = true;
    return result;
  };
  const [result] = await manage({ ...f.context, run: interrupted, cleanupRun: native }, { operation: 'install', agents: ['codex'], from: next, migrate: true });
  assert.equal(result.status, 'error');
  assert.match(result.message, /Injected native readback failure/);
  assert.match(result.actions.join(' '), /active Codex cache was refreshed/);
  assert.match(await readFile(cache, 'utf8'), /Before/);
  assert.deepEqual((await loadState(f.context.data)).targets.codex?.source, { kind: 'local', path: f.source });
});

test('explicit install repairs a missing Codex snapshot without enabling a disabled copy', async t => {
  const f = await nativeHarness(t);
  f.cli(['install', '--agent', 'codex', '--from', f.source]);
  const root = join(f.context.data, 'snapshots/codex');
  await rm(root, { recursive: true });
  const config = join(f.env.CODEX_HOME, 'config.toml');
  const initial = await readFile(config, 'utf8');
  const disabled = initial.replace('enabled = true', 'enabled = false');
  assert.notEqual(disabled, initial);
  await writeFile(config, disabled);
  await put(f.source, 'skills/demo/SKILL.md', 'Restored local source\n');
  const result = f.cli(['install', '--agent', 'codex', '--from', f.source], 2).results[0];
  assert.equal(result.status, 'needs-action');
  assert.match(result.actions.join(' '), /missing local snapshot was restored/);
  assert.equal(await readFile(config, 'utf8'), disabled);
  assert.equal(await readFile(join(root, 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Restored local source\n');
});
