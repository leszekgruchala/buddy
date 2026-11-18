import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { fixture } from './helpers.ts';

test('a FIFO state file is rejected without blocking the CLI', async t => {
  const { context } = await fixture(t);
  await mkdir(context.data, { recursive: true });
  assert.equal(spawnSync('mkfifo', [join(context.data, 'state.json')], { timeout: 1000 }).status, 0);
  const module = new URL('../src/storage.ts', import.meta.url).href;
  const script = `import { loadState } from ${JSON.stringify(module)};
    try { await loadState(${JSON.stringify(context.data)}); process.exitCode = 1; }
    catch (error) { if (!error.message.includes('Cannot read Buddy CLI state')) throw error; }`;
  const child = spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(child.status, 0, child.stderr || child.error?.message);
});
