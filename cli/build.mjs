import { build } from 'esbuild';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const plugin = JSON.parse(await readFile(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'));
if (pkg.version !== plugin.version) throw new Error('CLI and plugin versions differ.');
const result = await build({
  entryPoints: ['cli/src/cli.ts'],
  outfile: 'cli/dist/buddy.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22.12',
  banner: { js: '#!/usr/bin/env node\nimport { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  define: { __BUDDY_VERSION__: JSON.stringify(pkg.version) },
  legalComments: 'inline',
  metafile: true,
});
const bundled = new Set(Object.keys(result.metafile.inputs).filter(path => path.startsWith('node_modules/')).map(path => {
  const parts = path.slice('node_modules/'.length).split('/');
  return parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}));
const notices = [];
for (const name of [...bundled].sort()) {
  const root = join('node_modules', name);
  const info = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  let license;
  for (const filename of ['LICENSE', 'LICENSE.md', 'license', 'license.md']) {
    try { license = await readFile(join(root, filename), 'utf8'); break; } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!license) throw new Error(`No license notice found for bundled package ${name}.`);
  notices.push(`${name}@${info.version}\n${license.trim()}`);
}
await writeFile('cli/dist/THIRD_PARTY_NOTICES.txt', notices.join('\n\n---\n\n') + '\n');
await chmod('cli/dist/buddy.mjs', 0o755);
