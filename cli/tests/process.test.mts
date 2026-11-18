import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runner } from '../src/process.ts';

test('a diagnostic deadline terminates a child that ignores SIGTERM', async t => {
  const root = await mkdtemp(join(tmpdir(), 'process-probe-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const ready = join(root, 'ready');
  const script = `process.on('SIGTERM', () => {});
    require('node:fs').writeFileSync(${JSON.stringify(ready)}, 'ready');
    setInterval(() => {}, 1000);
    setTimeout(() => process.exit(0), 5000);`;
  const started = performance.now();
  await assert.rejects(runner(undefined, 10_000)({ bin: process.execPath, args: ['-e', script], timeoutMs: 500 }));
  assert.ok(performance.now() - started < 2_000, 'The diagnostic child ignored its short deadline');
  assert.equal(await readFile(ready, 'utf8'), 'ready');
});

for (const [description, script] of [
  ['a child ignores SIGTERM', `process.on('SIGTERM', () => {});
    setTimeout(() => process.exit(0), 2500);`],
  ['a wrapper exits successfully with inherited pipes still open', `
    require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 2500)'], {
      stdio: ['ignore', 'inherit', 'inherit'],
    }).unref();
    process.exit(0);`],
]) {
  test(`the runner reports a timeout when ${description}`, async () => {
    const started = performance.now();
    await assert.rejects(runner(undefined, 500)({ bin: process.execPath, args: ['-e', script] }),
      { message: `Cannot run ${process.execPath}: timed out after 500 ms.` });
    assert.ok(performance.now() - started < 2_000, 'The command outlasted its deadline');
  });
}
