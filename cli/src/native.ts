import { lstat, realpath } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { parseJson } from './process.ts';
import { checkCancelled, object } from './types.ts';
import type { Agent, Command, Context, MarketplaceName, Source } from './types.ts';
import { assertRealParents, readRegularJson } from './paths.ts';

export interface Installation { id: string; version?: string; enabled?: boolean; scope?: string; folder?: string }
export interface Marketplace { name: string; local?: string; repo?: string; ref?: string }
export interface Inventory { plugins: Installation[]; markets: Marketplace[] }

export function command(agent: Agent, args: string[]): Command {
  return { bin: agent === 'cursor' ? 'cursor-agent' : agent, args };
}

/** Execute one native operation without interpreting arbitrary failures as idempotent success. */
export async function execute(context: Context, cmd: Command): Promise<string> {
  checkCancelled(context);
  const result = await context.run(cmd);
  checkCancelled(context);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().slice(0, 1000);
    throw new Error(`${cmd.bin} ${cmd.args.join(' ')} failed (${result.code}). ${detail}`);
  }
  return result.stdout;
}

function rows(value: unknown, key?: string): Record<string, unknown>[] {
  const list = key && object(value) ? value[key] : value;
  if (!Array.isArray(list) || !list.every(object)) throw new Error('Unsupported native plugin list format. No changes were made.');
  return list;
}

/** Inspect only Buddy-related native records, validating the actual Codex and Claude JSON shapes. */
export async function inventory(context: Context, agent: Exclude<Agent, 'cursor'>, readOnly = false): Promise<Inventory> {
  if (agent === 'claude' && readOnly) return claudeMetadata(context);
  const results = await Promise.allSettled([
    execute(context, command(agent, ['plugin', 'list', '--json'])),
    execute(context, command(agent, ['plugin', 'marketplace', 'list', '--json'])),
  ]);
  const output = results.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return parseJson(result.value);
  });
  const plugins = rows(output[0], agent === 'codex' ? 'installed' : undefined)
    .map(row => {
      if (row.name === 'buddy' && typeof row[agent === 'codex' ? 'pluginId' : 'id'] !== 'string') throw new Error('Unsupported native Buddy identity. No changes were made.');
      return row;
    })
    .filter(row => typeof row[agent === 'codex' ? 'pluginId' : 'id'] === 'string')
    .filter(row => String(row[agent === 'codex' ? 'pluginId' : 'id']).split('@')[0] === 'buddy')
    .map(row => {
      const id = String(row[agent === 'codex' ? 'pluginId' : 'id']);
      if (row.enabled !== undefined && typeof row.enabled !== 'boolean') throw new Error('Invalid native Buddy enabled state.');
      if (agent === 'claude' && typeof row.scope !== 'string') throw new Error('Invalid native Buddy scope.');
      const version = agent === 'claude' && typeof row.folderVersion === 'string' ? row.folderVersion : row.version;
      if (version !== undefined && typeof version !== 'string') throw new Error('Invalid native Buddy version.');
      return { id, version, enabled: row.enabled, scope: typeof row.scope === 'string' ? row.scope : undefined,
        folder: typeof row.readFromFolder === 'string' ? row.readFromFolder : undefined };
    });
  const markets = rows(output[1], agent === 'codex' ? 'marketplaces' : undefined)
    .filter(row => row.name === 'buddy' || row.name === 'buddy-local')
    .map(row => {
      const source = row.marketplaceSource;
      if (agent === 'codex') {
        if (source !== undefined && !object(source)) throw new Error('Invalid native marketplace source.');
        const kind = object(source) ? source.sourceType : undefined;
        const origin = object(source) && typeof source.source === 'string' ? source.source : undefined;
        return { name: String(row.name), local: kind === 'local' ? origin ?? string(row.root) : undefined,
          repo: kind !== 'local' ? origin : undefined, ref: object(source) ? string(source.ref) : undefined };
      }
      return { name: String(row.name), local: row.source === 'directory' ? string(row.path) : undefined,
        repo: string(row.repo) ?? string(row.url), ref: string(row.ref) };
    });
  return { plugins, markets };
}

async function readObject(path: string, followLink = false): Promise<Record<string, unknown>> {
  let value: unknown;
  try { value = await readRegularJson(followLink ? await realpath(path) : path); } catch (error) {
    if (object(error) && error.code === 'ENOENT') return {};
    throw new Error(`Cannot inspect native metadata at ${path}.`, { cause: error });
  }
  if (!object(value)) throw new Error(`Invalid native metadata at ${path}.`);
  return value;
}

async function claudeMetadata(context: Context): Promise<Inventory> {
  // Native plugin list can migrate .claude.json even during an inspection.
  const config = context.claudeConfig ?? join(context.home, '.claude');
  const installed = await readObject(join(config, 'plugins/installed_plugins.json'));
  const known = await readObject(join(config, 'plugins/known_marketplaces.json'));
  // Users may keep settings.json in another directory, such as a dotfiles checkout.
  const settings = await readObject(join(config, 'settings.json'), true);
  if (installed.plugins !== undefined && (installed.version !== 2 || !object(installed.plugins))) throw new Error('Unsupported Claude installation metadata. Use native diagnostics.');
  const markets: Marketplace[] = [];
  for (const [name, row] of Object.entries(known)) {
    if (name !== 'buddy' && name !== 'buddy-local') continue;
    if (!object(row) || !object(row.source)) throw new Error('Invalid Claude marketplace metadata.');
    markets.push({ name, local: row.source.source === 'directory' ? string(row.source.path) : undefined,
      repo: string(row.source.repo) ?? string(row.source.url), ref: string(row.source.ref) });
  }
  const plugins: Installation[] = [];
  for (const [id, records] of Object.entries(object(installed.plugins) ? installed.plugins : {})) {
    if (id.split('@')[0] !== 'buddy') continue;
    if (!Array.isArray(records) || !records.every(object)) throw new Error('Invalid Claude Buddy installation metadata.');
    for (const row of records) {
      if (typeof row.scope !== 'string' || typeof row.version !== 'string') throw new Error('Invalid Claude Buddy scope or version.');
      const market = known[id.split('@')[1]];
      let folder: string | undefined;
      let version = row.version;
      if (object(market) && object(market.source) && market.source.source === 'directory') {
        const root = string(market.installLocation) ?? string(market.source.path);
        if (!root) throw new Error('Missing Claude local marketplace path.');
        const catalog = await readObject(join(root, '.claude-plugin/marketplace.json'));
        if (!Array.isArray(catalog.plugins)) throw new Error('Invalid Claude local marketplace catalog.');
        const entry = catalog.plugins.find((entry: unknown) => object(entry) && entry.name === 'buddy');
        if (!object(entry) || typeof entry.source !== 'string' || !entry.source.startsWith('.')) throw new Error('Cannot inspect this Claude local source without native initialization.');
        folder = resolve(root, entry.source);
        const manifest = await readObject(join(folder, '.claude-plugin/plugin.json'));
        if (typeof manifest.version === 'string') version = manifest.version;
      } else {
        if (typeof row.installPath !== 'string') throw new Error('Missing Claude plugin cache path.');
        const manifest = await readObject(join(row.installPath, '.claude-plugin/plugin.json'));
        if (manifest.name !== 'buddy' || typeof manifest.version !== 'string') throw new Error('The Claude Buddy cache is missing or invalid.');
      }
      const enabled = object(settings.enabledPlugins) ? settings.enabledPlugins[id] : undefined;
      plugins.push({ id, scope: row.scope, version, folder, enabled: typeof enabled === 'boolean' ? enabled : undefined });
    }
  }
  return { plugins, markets };
}

function string(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }

export function marketplace(source: Source, name?: MarketplaceName): MarketplaceName { return name ?? (source.kind === 'github' ? 'buddy' : 'buddy-local'); }

function buddyRepository(repo: string): boolean {
  return repo.replace(/^https:\/\/github\.com\//, '').replace(/^git@github\.com:/, '').replace(/\/$/, '').replace(/@main$/, '').replace(/\.git$/, '') === 'leszekgruchala/buddy';
}

/** Verify an existing plugin before accepting responsibility for its files or native registration. */
export async function verifyBuddyDirectory(root: string, agent: Agent): Promise<string | undefined> {
  const file = join(root, `.${agent}-plugin/plugin.json`);
  if ((await lstat(file)).isSymbolicLink() || await realpath(file) !== file) throw new Error('Existing Buddy manifests must not cross symlinks.');
  const manifest = await readObject(file);
  if (manifest.name !== 'buddy' || typeof manifest.repository !== 'string' || !buddyRepository(manifest.repository)) throw new Error('The existing folder is not a verified Buddy plugin from leszekgruchala/buddy.');
  return string(manifest.version);
}

/** Resolve a single contained Buddy entry without adopting unrelated marketplace plugins. */
export async function localPlugin(market: Marketplace, agent: Exclude<Agent, 'cursor'>): Promise<string> {
  if (!market.local) throw new Error('The native local marketplace has no source directory.');
  const root = resolve(market.local);
  await assertRealParents(root);
  const catalogPath = join(root, agent === 'codex' ? '.agents/plugins/marketplace.json' : '.claude-plugin/marketplace.json');
  if (await realpath(catalogPath) !== catalogPath) throw new Error('Local marketplace catalogs must not cross symlinks.');
  const catalog = await readObject(catalogPath);
  if (catalog.name !== market.name || !Array.isArray(catalog.plugins) || catalog.plugins.length !== 1) throw new Error('Adoption requires a marketplace containing only Buddy with its registered name.');
  const entry: unknown = catalog.plugins[0];
  if (!object(entry) || entry.name !== 'buddy') throw new Error('The local marketplace is not a verified Buddy-only source.');
  const source = entry.source;
  const path = agent === 'codex' && object(source) && source.source === 'local' ? source.path : agent === 'claude' ? source : undefined;
  if (typeof path !== 'string' || !path.startsWith('.')) throw new Error('The existing local Buddy source must be a contained relative directory.');
  const plugin = resolve(root, path);
  if ((plugin !== root && !plugin.startsWith(root + sep)) || await realpath(plugin) !== plugin) throw new Error('The existing local Buddy source escapes its marketplace or crosses a symlink.');
  for (const directory of new Set([root, plugin])) {
    try { await lstat(join(directory, '.buddy-cli-owned.json')); } catch (error) {
      if (object(error) && error.code === 'ENOENT') continue;
      throw error;
    }
    throw new Error('This local Buddy source is already owned by a CLI manager. Use the same BUDDY_HOME; another manager cannot adopt it.');
  }
  await verifyBuddyDirectory(plugin, agent);
  return plugin;
}

/** Check source identity before adopting an install or using an existing marketplace name. */
export async function verifySource(market: Marketplace, source: Source, localRoot: string): Promise<void> {
  if (source.kind === 'local') {
    if (market.local && resolve(market.local) === resolve(localRoot)) {
      await assertRealParents(localRoot);
      return;
    }
  } else if (market.repo) {
    if (buddyRepository(market.repo) && (!market.ref || market.ref === 'main')) return;
  }
  throw new Error(`Marketplace ${market.name} has a different or unverified source. Use native plugin management to resolve it; Buddy will not replace it.`);
}

/** Codex cannot list plugins from a missing local root. Match only the exact native registration failure. */
export async function codexReportsMissingMarketplace(context: Context, name: MarketplaceName, root: string): Promise<boolean> {
  checkCancelled(context);
  const result = await context.run(command('codex', ['plugin', 'marketplace', 'list', '--json']));
  checkCancelled(context);
  return result.code === 1 && result.stderr.trim() === `Error: failed to load marketplace(s):\n- \`${name}\` at ${root}: marketplace root does not contain a supported manifest`;
}

/** Refresh a verified prior Codex installation and check the cache path returned by native add. */
export async function restoreCodexCache(context: Context, plugin: Installation, directory: string): Promise<string> {
  if (plugin.enabled !== true) throw new Error('The previous Codex plugin was disabled or its enabled state could not be verified.');
  if (!plugin.version || await verifyBuddyDirectory(directory, 'codex') !== plugin.version) throw new Error('The previous Codex cache version does not match its marketplace source.');
  const restored = parseJson(await execute(context, command('codex', ['plugin', 'add', plugin.id, '--json'])));
  const cache = object(restored) ? string(restored.installedPath) : undefined;
  if (!object(restored) || restored.pluginId !== plugin.id || restored.version !== plugin.version || !cache || resolve(cache) !== cache
    || await verifyBuddyDirectory(cache, 'codex') !== plugin.version) throw new Error('Codex did not report a verified restored plugin cache.');
  return cache;
}

/** Refuse duplicate source identities and Claude scopes this CLI does not manage. */
export function verifyInstallations(data: Inventory, agent: Agent, source: Source, name?: MarketplaceName): void {
  if (data.plugins.length > 1) throw new Error('Buddy has multiple native installations. Select one source/scope in the native client before adoption.');
  const expected = `buddy@${marketplace(source, name)}`;
  for (const plugin of data.plugins) {
    if (plugin.id !== expected || (agent === 'claude' && plugin.scope !== 'user')) {
      throw new Error(`Buddy is also installed as ${plugin.id}${plugin.scope ? ` (${plugin.scope})` : ''}. Resolve this source/scope in the native client before continuing.`);
    }
  }
}
