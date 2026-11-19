import { cp, mkdtemp, mkdir, readFile, writeFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runner } from '../src/process.ts';
import type { Agent, Command, Context, Runner } from '../src/types.ts';

/** Give each test real, isolated files and a native CLI seam; never use the user's home. */
export async function fixture(t: TestContext) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'buddy-cli-test-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = join(root, 'home');
  const source = join(root, 'checkout with spaces');
  await mkdir(home);
  await mkdir(source);
  const run = runner();
  const initialized = await run({ bin: 'git', args: ['init', '-q'], cwd: source });
  if (initialized.code) throw new Error(initialized.stderr);
  for (const harness of ['claude', 'codex', 'cursor']) await put(source, `.${harness}-plugin/plugin.json`, JSON.stringify({ name: 'buddy', version: '1.0.0', repository: 'https://github.com/leszekgruchala/buddy' }) + '\n');
  await put(source, '.gitignore', '.ai\nignored.txt\n');
  await put(source, 'skills/demo/SKILL.md', '---\nname: demo\ndescription: Fixture skill.\n---\nBefore\n');
  const native = new FakeNative(run);
  const context: Context = { home, data: join(home, '.buddy', 'cli'), run: native.run, cleanupRun: native.run };
  return { root, home, source, native, context };
}

export async function put(root: string, name: string, text: string): Promise<void> {
  const path = join(root, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, text);
}

/** Give adoption tests an unmarked copy matching the legacy Cursor installation layout. */
export async function legacyCursor(t: TestContext) {
  const f = await fixture(t);
  const local = join(f.home, '.cursor/plugins/local/buddy');
  await cp(f.source, local, { recursive: true });
  await rm(join(local, '.git'), { recursive: true });
  return { ...f, local };
}

/** Reproduce either a legacy copied marketplace or a marketplace rooted in the source checkout. */
export async function legacyMarketplace(source: string, root: string, agent: 'codex' | 'claude', name = 'buddy-local'): Promise<string> {
  const direct = source === root;
  const plugin = direct ? root : join(root, 'buddy');
  if (!direct) {
    await cp(source, plugin, { recursive: true });
    await rm(join(plugin, '.git'), { recursive: true, force: true });
  }
  await put(root, agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json', JSON.stringify({ name,
    ...(agent === 'claude' ? { owner: { name: 'Fixture' } } : {}),
    plugins: [{ name: 'buddy', source: agent === 'codex' ? { source: 'local', path: direct ? '.' : './buddy' } : direct ? './' : './buddy' }],
  }) + '\n');
  return plugin;
}

/** Run actual native clients only after asserting all user-state roots are isolated. */
export async function nativeHarness(t: TestContext) {
  const f = await fixture(t);
  const env = { ...process.env, HOME: f.home, CODEX_HOME: join(f.home, '.codex'), CLAUDE_CONFIG_DIR: join(f.home, '.claude'), BUDDY_HOME: join(f.home, '.buddy') };
  await mkdir(env.CODEX_HOME);
  const bundle = fileURLToPath(new URL('../dist/buddy.mjs', import.meta.url));
  function native(bin: string, args: string[], input?: string) {
    for (const path of [env.HOME, env.CODEX_HOME, env.CLAUDE_CONFIG_DIR, env.BUDDY_HOME]) assert.ok(resolve(path).startsWith(f.root + sep));
    const result = spawnSync(bin, args, { env, cwd: f.root, input, encoding: 'utf8', timeout: 60_000 });
    if (result.error) throw result.error;
    return result;
  }
  function cli(args: string[], status = 0) {
    const result = native(process.execPath, [bundle, ...args, '--json']);
    assert.equal(result.status, status, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  }
  return { ...f, env, native, cli };
}

interface Plugin { id: string; version: string; scope: string; enabled: boolean; readFromFolder?: string }
interface Market { name: string; source: string; path?: string; repo?: string }

export class FakeNative {
  calls: Command[] = [];
  plugins: Record<Exclude<Agent, 'cursor'>, Plugin[]> = { codex: [], claude: [] };
  markets: Record<Exclude<Agent, 'cursor'>, Market[]> = { codex: [], claude: [] };
  fail?: (cmd: Command) => boolean;
  private git: Runner;

  constructor(git: Runner) { this.git = git; }

  seed(agent: 'codex' | 'claude', repo = 'leszekgruchala/buddy'): void {
    this.plugins[agent] = [{ id: 'buddy@buddy', version: '1.0.0', enabled: true, scope: 'user' }];
    this.markets[agent] = [{ name: 'buddy', source: 'github', repo }];
  }

  run: Runner = async cmd => {
    this.calls.push(cmd);
    if (cmd.bin === 'git') return this.git(cmd);
    if (this.fail?.(cmd)) return { code: 1, stdout: '', stderr: 'fixture failure' };
    const ok = (value: unknown = {}) => ({ code: 0, stdout: JSON.stringify(value), stderr: '' });
    if (cmd.args.includes('--help')) return ok();
    if (cmd.args[0] === '--version') return { code: 0, stdout: '2.1.322\n', stderr: '' };
    if (cmd.bin === 'cursor-agent') return ok();
    if (cmd.bin !== 'codex' && cmd.bin !== 'claude') throw new Error(`Unexpected executable ${cmd.bin}`);
    const agent = cmd.bin;
    const args = cmd.args;
    if (args[1] === 'list') return ok(agent === 'codex'
      ? { installed: this.plugins.codex.map(p => ({ ...p, pluginId: p.id })) }
      : this.plugins.claude);
    if (args[1] === 'marketplace') {
      if (args[2] === 'list') return ok(agent === 'codex' ? { marketplaces: this.markets.codex.map(m => ({ name: m.name,
        marketplaceSource: { sourceType: m.source === 'directory' ? 'local' : 'git', source: m.path ?? m.repo } })) } : this.markets.claude);
      if (args[2] === 'remove') this.markets[agent] = this.markets[agent].filter(m => m.name !== args[3]);
      if (args[2] === 'add') {
        const origin = args[3];
        if (origin.startsWith('/')) {
          const catalog = JSON.parse(await readFile(join(origin, agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json'), 'utf8'));
          // Claude reports success but keeps the existing name when the directory is already registered.
          if (agent === 'claude' && this.markets.claude.some(m => m.path && resolve(m.path) === resolve(origin) && m.name !== catalog.name)) return ok();
          this.markets[agent] =this.markets[agent].filter(m => m.name !== catalog.name);
          this.markets[agent].push({ name: catalog.name, source: 'directory', path: origin });
          if (agent === 'claude') for (const plugin of this.plugins.claude) if (plugin.id === `buddy@${catalog.name}`) plugin.readFromFolder = resolve(origin, catalog.plugins[0].source);
        } else {
          this.markets[agent] = this.markets[agent].filter(m => m.name !== 'buddy');
          this.markets[agent].push({ name: 'buddy', source: 'github', repo: 'leszekgruchala/buddy' });
        }
      }
      return ok();
    }
    if (args[1] === 'add' || args[1] === 'install') {
      const folder = this.markets[agent].find(m => m.name === args[2].split('@')[1])?.path;
      this.plugins[agent] = [{ id: args[2], version: '1.0.0', scope: 'user', enabled: true, readFromFolder: folder ? join(folder, 'buddy') : undefined }];
    }
    if (args[1] === 'remove' || args[1] === 'uninstall') this.plugins[agent] = [];
    return ok();
  };

  mutations(): Command[] {
    return this.calls.filter(c => c.bin !== 'git' && !c.args.includes('--help') && c.args[0] !== '--version' && !c.args.includes('list'));
  }
}
