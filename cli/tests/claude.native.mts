import assert from 'node:assert/strict';
import { lstat, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { legacyMarketplace, nativeHarness, put } from './helpers.ts';

test('real Claude adopts disabled buddy@buddy from a local repository and preserves options at the same version', async t => {
  const f = await nativeHarness(t);
  await put(f.source, '.claude-plugin/plugin.json', JSON.stringify({ name: 'buddy', version: '1.0.0', repository: 'https://github.com/leszekgruchala/buddy',
    userConfig: { show_mod: { type: 'boolean', title: 'Show mod', description: 'Fixture option.', default: true } } }) + '\n');
  await legacyMarketplace(f.source, f.source, 'claude', 'buddy');
  const catalog = await readFile(join(f.source, '.claude-plugin/marketplace.json'), 'utf8');
  assert.equal(f.native('claude', ['plugin', 'marketplace', 'add', f.source, '--json']).status, 0);
  assert.equal(f.native('claude', ['plugin', 'install', 'buddy@buddy', '--scope', 'user', '--json']).status, 0);
  assert.equal(f.native('claude', ['plugin', 'configure', 'buddy@buddy', '--values-stdin'], '{"show_mod":"false"}').status, 0);
  assert.equal(f.native('claude', ['plugin', 'disable', 'buddy@buddy', '--scope', 'user']).status, 0);
  assert.equal(f.cli(['doctor', '--agent', 'claude'], 2).results[0].source.path, f.source);
  f.cli(['install', '--agent', 'claude', '--from', f.source]);
  const listed = JSON.parse(f.native('claude', ['plugin', 'list', '--json']).stdout)[0];
  assert.equal(listed.id, 'buddy@buddy');
  assert.equal(listed.enabled, false);
  assert.equal(listed.readFromFolder, join(f.context.data, 'snapshots/claude/buddy'));
  const settings = JSON.parse(await readFile(join(f.env.CLAUDE_CONFIG_DIR, 'settings.json'), 'utf8'));
  assert.equal(settings.pluginConfigs['buddy@buddy'].options.show_mod, false);
  assert.equal(await readFile(join(f.source, '.claude-plugin/marketplace.json'), 'utf8'), catalog);
  f.cli(['doctor', '--agent', 'claude'], 2);
  f.cli(['update', '--agent', 'claude']);
});

test('Claude doctor does not initialize a fresh user configuration', async t => {
  const f = await nativeHarness(t);
  f.cli(['doctor', '--agent', 'claude']);
  await assert.rejects(lstat(f.env.CLAUDE_CONFIG_DIR), { code: 'ENOENT' });
  await assert.rejects(lstat(join(f.home, '.claude.json')), { code: 'ENOENT' });
});

test('Claude local refresh keeps plugin options and repeated install preserves disabled state', async t => {
  const f = await nativeHarness(t);
  await put(f.source, '.claude-plugin/plugin.json', JSON.stringify({name:'buddy',version:'1.0.0',
    userConfig:{show_mod:{type:'boolean',title:'Show Buddy mod',description:'Fixture option.',default:true}}}) + '\n');
  f.cli(['install', '--agent', 'claude', '--from', f.source]);
  const state = JSON.parse(await readFile(join(f.env.BUDDY_HOME, 'cli/state.json'), 'utf8'));
  assert.equal(state.targets.claude.source.path, f.source);
  assert.equal(f.native('claude', ['plugin', 'configure', 'buddy@buddy-local', '--values-stdin'], '{"show_mod":"false"}').status, 0);
  await put(f.source, 'skills/demo/SKILL.md', 'Updated while keeping config\n');
  f.cli(['update', '--agent', 'claude']);
  const settings = JSON.parse(await readFile(join(f.env.CLAUDE_CONFIG_DIR, 'settings.json'), 'utf8'));
  assert.equal(settings.pluginConfigs['buddy@buddy-local'].options.show_mod, false);
  f.cli(['doctor', '--agent', 'claude']);
  assert.equal(f.native('claude', ['plugin', 'disable', 'buddy@buddy-local', '--scope', 'user']).status, 0);
  assert.equal(f.cli(['install', '--agent', 'claude', '--from', f.source]).results[0].status, 'ok');
  const listed = f.native('claude', ['plugin', 'list', '--json']);
  assert.equal(JSON.parse(listed.stdout)[0].enabled, false);
});

test('explicit install repairs a missing Claude snapshot and preserves its native identity', async t => {
  const f = await nativeHarness(t);
  f.cli(['install', '--agent', 'claude', '--from', f.source]);
  const root = join(f.context.data, 'snapshots/claude');
  await rm(root, { recursive: true });
  await put(f.source, 'skills/demo/SKILL.md', 'Restored in place\n');
  const result = f.cli(['install', '--agent', 'claude', '--from', f.source]).results[0];
  assert.deepEqual(result.commands, []);
  const listed = JSON.parse(f.native('claude', ['plugin', 'list', '--json']).stdout)[0];
  assert.equal(listed.id, 'buddy@buddy-local');
  assert.equal(listed.readFromFolder, join(root, 'buddy'));
  assert.equal(await readFile(join(root, 'buddy/skills/demo/SKILL.md'), 'utf8'), 'Restored in place\n');
});
