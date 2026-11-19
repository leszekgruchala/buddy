import { join, resolve } from 'node:path';
import { lstat, realpath } from 'node:fs/promises';
import { codexReportsMissingMarketplace, inventory, command, execute, localPlugin, marketplace, restoreCodexCache, verifyBuddyDirectory, verifyInstallations, verifySource } from './native.ts';
import type { Installation, Inventory, Marketplace } from './native.ts';
import { assertOwned, checkout, CheckoutRootError, snapshot, snapshotDigest, snapshotPath, snapshotSource, removeSnapshot, restoreSnapshot, UnmarkedSnapshotError } from './snapshot.ts';
import { loadState, lock, lockCursor, saveState } from './storage.ts';
import { checkCancelled, message, object } from './types.ts';
import type { Agent, Command, Context, MarketplaceName, Operation, Result, Source, State, Target } from './types.ts';

export interface Request { operation: Operation; agents: Agent[]; from?: string; dryRun?: boolean; migrate?: boolean }
const github = 'https://github.com/leszekgruchala/buddy';

function removalActions(agent: Agent, source?: Source, keptRoot?: string): string[] {
  if (agent === 'cursor' && source?.kind !== 'local') return ['Remove Buddy in Cursor Customize → Plugins. Native UI completion is unverified; the CLI relinquishes its tracking record. The shared marketplace stays registered.'];
  const actions = agent === 'claude'
    ? ['Claude keeps the data directory, but removes stored options/secrets when the last scope is uninstalled.']
    : agent === 'codex' ? ['Codex removes the installed plugin and its cache.'] : ['Remove only the owned Cursor local snapshot.'];
  if (keptRoot) actions.push(`The marketplace source directory ${keptRoot} is kept.`);
  actions.push('Start a fresh agent session after removal.');
  return actions;
}

function actions(agent: Agent, local: boolean): string[] {
  if (agent === 'codex') return ['Start a new Codex session and review/trust Buddy hooks in /hooks. Trust is never granted by this CLI.'];
  if (agent === 'claude') return ['Run /reload-plugins or start a new Claude Code session.'];
  return [local
    ? 'In Cursor, disable any marketplace Buddy that takes precedence over this local copy. Check your organization permits local plugins.'
    : 'In Cursor Customize → Browser Marketplace, install or re-add Buddy from its marketplace. CLI marketplace registration does not install the plugin.',
  'Reload the Cursor window and start a new agent chat.'];
}

function plan(context: Context, agent: Agent, operation: Operation, source: Source, registered: boolean, installed: boolean, name?: MarketplaceName, replace = false): Command[] {
  if (agent === 'cursor') {
    if (source.kind === 'local' || operation === 'uninstall') return [];
    return [command(agent, ['plugin', 'marketplace', operation === 'update' || registered ? 'update' : 'add', github,
      ...(operation === 'install' && !registered ? ['--git-ref', 'main'] : [])])];
  }
  const market = marketplace(source, name);
  const id = `buddy@${market}`;
  if (operation === 'uninstall') {
    const commands = !installed ? [] : [command(agent, agent === 'codex'
      ? ['plugin', 'remove', id, '--json'] : ['plugin', 'uninstall', id, '--scope', 'user', '--keep-data', '--json'])];
    // Remove the registration only after the plugin: Claude also uninstalls plugins of a removed marketplace.
    if (registered) commands.push(command(agent, ['plugin', 'marketplace', 'remove', market, ...(agent === 'claude' ? ['--scope', 'user'] : []), '--json']));
    return commands;
  }
  const commands: Command[] = [];
  if (replace && agent === 'codex') commands.push(command(agent, ['plugin', 'marketplace', 'remove', market, '--json']));
  if (!registered || replace) {
    const origin = source.kind === 'local' ? snapshotPath(context, agent) : agent === 'codex' ? 'leszekgruchala/buddy' : 'leszekgruchala/buddy@main';
    commands.push(command(agent, ['plugin', 'marketplace', 'add', origin,
      ...(agent === 'codex' && source.kind === 'github' ? ['--ref', 'main'] : []),
      ...(agent === 'claude' ? ['--scope', 'user'] : []), '--json']));
  }
  if (source.kind === 'github' && (operation === 'update' || registered)) commands.push(command(agent, ['plugin', 'marketplace', agent === 'codex' ? 'upgrade' : 'update', market, '--json']));
  if (agent === 'codex') {
    // Git marketplace upgrade refreshes installed plugins; local snapshots need add.
    if (operation === 'install' || source.kind === 'local' || !installed) commands.push(command(agent, ['plugin', 'add', id, '--json']));
  } else if (!installed) commands.push(command(agent, ['plugin', 'install', id, '--scope', 'user', '--json']));
  else if (source.kind === 'github') commands.push(command(agent, ['plugin', 'update', id, '--scope', 'user', '--json']));
  return commands;
}

async function verifyCurrent(context: Context, agent: Exclude<Agent, 'cursor'>, source: Source, data: Inventory, required = false, name?: MarketplaceName, repair = false): Promise<Marketplace | undefined> {
  verifyInstallations(data, agent, source, name);
  const market = data.markets.find(row => row.name === marketplace(source, name));
  if (!market) {
    if (required || data.plugins.length) throw new Error('Buddy has no verified marketplace. Resolve its native source before changing this installation.');
    return;
  }
  await verifySource(market, source, snapshotPath(context, agent));
  if (source.kind === 'local') {
    const present = await assertOwned(snapshotPath(context, agent), context, agent, source.path);
    if (!present && !repair) throw new Error('The managed local snapshot is missing.');
    if (agent === 'claude' && data.plugins.length) {
      const folder = data.plugins[0]?.folder;
      const expected = join(snapshotPath(context, agent), 'buddy');
      const matches = present ? folder && await realpath(folder) === await realpath(expected) : !folder || resolve(folder) === expected;
      if (!matches) throw new Error('Claude is not reading the managed snapshot in place. Resolve its native source before refreshing.');
    }
  }
  return market;
}

interface Existing { target: Target; market: Marketplace; external: boolean }

async function existing(context: Context, agent: Exclude<Agent, 'cursor'>, data: Inventory, requestedMarket?: MarketplaceName): Promise<Existing | undefined> {
  const plugin = data.plugins[0];
  // Claude keeps the old name when a directory is added again, so a dormant registration of the managed snapshot keeps its identity.
  const root = snapshotPath(context, agent);
  const name = plugin ? plugin.id.split('@')[1] : (data.markets.find(row => row.name === requestedMarket)
    ?? (requestedMarket === 'buddy-local' ? data.markets.find(row => row.local && resolve(row.local) === root) : undefined))?.name;
  if (name === undefined) return;
  if (name !== 'buddy' && name !== 'buddy-local') throw new Error('Unsupported native Buddy marketplace identity.');
  const market = data.markets.find(row => row.name === name);
  if (!market) throw new Error('Buddy has no verified marketplace. Resolve its native source before changing this installation.');
  verifyInstallations(data, agent, { kind: 'github' }, name);
  let source: Source;
  const external = Boolean(market.local && resolve(market.local) !== resolve(snapshotPath(context, agent)));
  if (market.local) source = { kind: 'local', path: external ? await localPlugin(market, agent) : await snapshotSource(context, agent) };
  else { source = { kind: 'github' }; await verifySource(market, source, snapshotPath(context, agent)); }
  return { target: { source, marketplace: name, version: plugin?.version }, market, external };
}

function differs(a: Source, b: Source): boolean {
  return a.kind !== b.kind || (a.kind === 'local' && b.kind === 'local' && a.path !== b.path);
}

function matchingMarket(data: Inventory, expected: Marketplace): boolean {
  const active = data.markets.find(row => row.name === expected.name);
  return Boolean(active && active.local === expected.local && active.repo === expected.repo && active.ref === expected.ref);
}

async function restoreMarketplace(context: Context, agent: Exclude<Agent, 'cursor'>, old: Marketplace, attempted: Source): Promise<void> {
  const current = await inventory(context, agent);
  const active = current.markets.find(row => row.name === old.name);
  if (matchingMarket(current, old)) return;
  if (active) await verifySource(active, attempted, snapshotPath(context, agent));
  const origin = old.local ?? (agent === 'codex' || old.repo?.endsWith('@main') ? old.repo : old.repo ? `${old.repo}@main` : undefined);
  if (!origin) throw new Error('The previous marketplace source cannot be restored automatically.');
  if (old.local) {
    if (resolve(old.local) === snapshotPath(context, agent)) await snapshotSource(context, agent);
    else await localPlugin(old, agent);
  } else {
    await verifySource(old, { kind: 'github' }, snapshotPath(context, agent));
  }
  if (agent === 'codex' && active) await execute(context, command(agent, ['plugin', 'marketplace', 'remove', old.name, '--json']));
  await execute(context, command(agent, ['plugin', 'marketplace', 'add', origin,
    ...(agent === 'codex' && !old.local ? ['--ref', 'main'] : []), ...(agent === 'claude' ? ['--scope', 'user'] : []), '--json']));
  if (!matchingMarket(await inventory(context, agent), old)) throw new Error('Native readback did not confirm the previous marketplace registration.');
}

async function recoverCodexCache(context: Context, previous: Target, market: Marketplace, plugin: Installation): Promise<void> {
  if (previous.source.kind !== 'local' || !market.local) throw new Error('The prior GitHub revision cannot be verified from the current registration.');
  const current = await inventory(context, 'codex');
  if (!matchingMarket(current, market)) throw new Error('The previous Codex marketplace registration is unverified.');
  verifyInstallations(current, 'codex', previous.source, previous.marketplace);
  if (current.plugins.some(row => row.enabled !== true)) throw new Error('The current Codex plugin is disabled or its enabled state is unknown.');
  const root = snapshotPath(context, 'codex');
  const managed = resolve(market.local) === root;
  if (managed) await verifyCurrent(context, 'codex', previous.source, current, true, previous.marketplace);
  const directory = managed ? join(root, 'buddy') : await localPlugin(market, 'codex');
  const expected = await snapshotDigest(directory);
  const cache = await restoreCodexCache(context, plugin, directory);
  if (await snapshotDigest(cache) !== expected) throw new Error('The Codex cache files differ from the previous local source.');
  const restored = await inventory(context, 'codex');
  verifyInstallations(restored, 'codex', previous.source, previous.marketplace);
  if (!matchingMarket(restored, market) || !restored.plugins.some(row => row.id === plugin.id && row.enabled === true && row.version === plugin.version)) throw new Error('Native readback did not confirm the restored Codex installation.');
}

async function persist(context: Context, state: State, agent: Agent, target?: Target): Promise<void> {
  const candidate: State = { schema: 1, targets: { ...state.targets } };
  if (target) candidate.targets[agent] = target;
  else delete candidate.targets[agent];
  await saveState(context, candidate);
  state.targets = candidate.targets;
}

async function one(context: Context, state: State, request: Request, result: Result, requestedSource?: Source): Promise<Result> {
  checkCancelled(context);
  const { agent } = result;
  const recorded = state.targets[agent];
  if (!request.dryRun && request.operation === 'install' && agent !== 'cursor' && requestedSource?.kind === 'local'
    && recorded?.source.kind === 'local' && !differs(recorded.source, requestedSource)
    && await snapshotMissing(context, agent)) {
    return repairSnapshot(context, state, request, result, agent, requestedSource, recorded);
  }
  return apply(context, state, request, result, requestedSource);
}

async function snapshotMissing(context: Context, agent: Agent): Promise<boolean> {
  try { await lstat(snapshotPath(context, agent)); }
  catch (error) {
    if (object(error) && error.code === 'ENOENT') return true;
    throw error;
  }
  return false;
}

async function repairSnapshot(context: Context, state: State, request: Request, result: Result, agent: Exclude<Agent, 'cursor'>, source: Extract<Source, { kind: 'local' }>, recorded: Target): Promise<Result> {
  const name = marketplace(source, recorded.marketplace);
  const root = snapshotPath(context, agent);
  if (agent !== 'codex' || !await codexReportsMissingMarketplace(context, name, root)) {
    await verifyCurrent(context, agent, source, await inventory(context, agent), true, name, true);
  }
  const { version } = await checkout(source.path, context);
  await snapshot(source, agent, context, { marketplace: name, expectedVersion: version, requireAbsent: true });
  try {
    await apply(context, state, request, result, source, version);
    result.actions.push(`The missing local snapshot was restored at ${root}.`);
    return result;
  } catch (error) {
    try {
      const retained = await removeSnapshot({ ...context, signal: undefined }, agent, source.path);
      if (retained) result.actions.push(`The incomplete snapshot repair was rolled back and its files were preserved at ${retained}.`);
    } catch (restoreError) { throw new Error(`${message(error)} Snapshot repair rollback failed: ${message(restoreError)}`); }
    throw error;
  }
}

async function apply(context: Context, state: State, request: Request, result: Result, requestedSource?: Source, repairedVersion?: string): Promise<Result> {
  const agent = result.agent;
  const operation = request.operation;
  const recorded = state.targets[agent];
  let target = recorded;
  let native: Inventory | undefined;
  let found: Existing | undefined;
  let oldMarket: Marketplace | undefined;
  if (!request.dryRun && agent !== 'cursor') {
    native = await inventory(context, agent);
    if (recorded && (native.plugins.length || !requestedSource || !differs(recorded.source, requestedSource))) {
      oldMarket = await verifyCurrent(context, agent, recorded.source, native, repairedVersion !== undefined, recorded.marketplace);
    } else {
      found = await existing(context, agent, native, requestedSource && marketplace(requestedSource));
      oldMarket = found?.market;
      target = native.plugins.length ? found?.target : undefined;
    }
  }
  const source = requestedSource ?? target?.source ?? { kind: 'github' };
  const name = target?.marketplace ?? found?.target.marketplace ?? marketplace(target?.source ?? source);
  result.source = source;
  if (operation === 'update' && native && !native.plugins.length) {
    result.status = 'needs-action';
    result.message = 'Buddy is not installed. Update does not reinstall it; run buddy install for this agent when you want it installed.';
    return result;
  }
  const changing = target && requestedSource && (target === recorded ? differs(target.source, requestedSource) : target.source.kind !== requestedSource.kind);
  if (changing && !request.migrate) {
    const origin = source.kind === 'github' ? 'github' : `'${source.path.replaceAll("'", "'\\''")}'`;
    result.status = 'needs-action';
    result.message = 'Buddy already uses a different source. Review the migration preview and explicitly approve it with --migrate.';
    result.actions = [`buddy install --agent ${agent} --from ${origin} --migrate --dry-run`,
      'Run the same command without --dry-run to preserve the plugin identity and migrate its source.'];
    return result;
  }
  if (agent !== 'cursor' && changing && source.kind === 'github' && name !== 'buddy') {
    result.status = 'needs-action';
    result.message = 'GitHub uses marketplace buddy; this installation uses buddy-local. The native client cannot change that identity while preserving its plugin settings.';
    result.actions = ['Keep the local source, or migrate the plugin identity and its settings explicitly in the native client. No changes were made.'];
    return result;
  }
  if (agent === 'cursor' && operation === 'uninstall' && (!target || source.kind === 'github')) {
    result.status = request.dryRun ? 'planned' : 'needs-action';
    result.actions = removalActions(agent, source);
    result.message = 'Cursor has no CLI plugin-uninstall command; complete removal in its native UI.';
    if (!request.dryRun && recorded) await persist(context, state, agent);
    return result;
  }
  if (operation !== 'install' && !target) {
    result.actions = operation === 'uninstall' ? removalActions(agent) : [];
    if (request.dryRun) { result.message = 'No recorded source. Dry-run cannot inspect or adopt native state.'; return result; }
    if (operation === 'uninstall') { result.message = 'Buddy is not installed in a verifiable managed source.'; return result; }
    result.status = 'needs-action';
    result.message = 'No recorded checkout source. Attach the existing installation with buddy install --agent ' + agent + ' --from /path/to/buddy.';
    return result;
  }
  if (request.dryRun) {
    result.commands = plan(context, agent, operation, source, agent === 'cursor' ? recorded?.source.kind === 'github' : Boolean(recorded), Boolean(recorded), name, Boolean(recorded && recorded.source.kind !== source.kind));
    result.message = source.kind === 'local' ? `${operation}: ${source.path} → ${snapshotPath(context, agent)}` : `${operation}: GitHub main`;
    result.actions = operation === 'uninstall' ? removalActions(agent, source) : actions(agent, source.kind === 'local');
    result.actions.push('Native state was not inspected. Existing Buddy adoption or same-name marketplace replacement may also be required.');
    return result;
  }
  if (source.kind === 'local' && operation !== 'uninstall') {
    try { result.version = repairedVersion ?? (await checkout(source.path, context)).version; }
    catch (error) {
      if (!requestedSource && found?.external && error instanceof CheckoutRootError) {
        result.status = 'needs-action';
        result.message = 'The existing local Buddy copy has no verified Git checkout provenance. Attach its source with buddy install --agent ' + agent + ' --from /path/to/buddy.';
        return result;
      }
      throw error;
    }
  }
  if (agent === 'claude' && source.kind === 'local' && operation !== 'uninstall') {
    const version = await execute(context, command(agent, ['--version']));
    const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    if (!match || Number(match[1]) < 2 || (Number(match[1]) === 2 && Number(match[2]) <= 1 && (Number(match[2]) < 1 || Number(match[3]) < 289))) throw new Error('Local snapshots require Claude Code 2.1.289 or later, with in-place plugin loading.');
  }
  if (native?.plugins.some(plugin => plugin.enabled !== true) && operation !== 'uninstall' && !(agent === 'claude' && source.kind === 'local')) {
    result.status = 'needs-action';
    result.message = 'Refresh was skipped because Buddy is disabled or its enabled state is unknown. Native add/install can enable it.';
    result.actions = ['Enable Buddy in the native client before requesting install/update, or leave it disabled.'];
    return result;
  }
  // Uninstall removes only Buddy's own registrations and keeps a user's directory marketplace.
  const external = Boolean(oldMarket?.local && resolve(oldMarket.local) !== snapshotPath(context, agent));
  const unregister = Boolean(oldMarket) && !external;
  const replace = Boolean(oldMarket && (source.kind === 'local'
    ? !oldMarket.local || resolve(oldMarket.local) !== resolve(snapshotPath(context, agent))
    : oldMarket.local));
  result.commands = plan(context, agent, operation, source, operation === 'uninstall' ? unregister : Boolean(oldMarket) || (agent === 'cursor' && recorded?.source.kind === 'github'), Boolean(native?.plugins.length), name, replace);
  for (const cmd of result.commands) {
    const depth = cmd.args[1] === 'marketplace' ? 3 : 2;
    await execute(context, { ...cmd, args: [...cmd.args.slice(0, depth), '--help'] });
  }
  checkCancelled(context);
  let backup: string | undefined;
  let published = false;
  const previousPlugin = native?.plugins[0];
  let registrationChanged = false;
  let codexCacheChanged = false;
  try {
    if (source.kind === 'local' && operation !== 'uninstall' && repairedVersion === undefined) {
      const adoptExistingCursor = agent === 'cursor' && recorded?.source.kind !== 'local';
      if (agent === 'cursor' && operation === 'update' && recorded?.source.kind === 'local') {
        if (!await assertOwned(snapshotPath(context, agent), context, agent, recorded.source.path)) {
          result.status = 'needs-action';
          result.message = 'The recorded local Cursor installation was removed. Run buddy install --agent cursor --from /path/to/buddy to install it again.';
          return result;
        }
      }
      const priorSource = (found && !found.external ? found.target : recorded)?.source;
      let previousSource = priorSource?.kind === 'local' ? priorSource.path : undefined;
      if (request.migrate) {
        try { previousSource = await snapshotSource(context, agent); }
        catch (error) {
          if (!(object(error) && error.code === 'ENOENT') && !(adoptExistingCursor && error instanceof UnmarkedSnapshotError)) throw error;
        }
      }
      const retained = await snapshot(source, agent, context, { marketplace: name, previousSource, expectedVersion: result.version, adoptExistingCursor });
      published = true;
      backup = retained[0];
      for (const path of retained) result.actions.push(`Previous local Buddy files preserved at ${path}.`);
    }
    for (const cmd of result.commands) {
      if (replace && cmd.args[1] === 'marketplace') registrationChanged = true;
      if (agent === 'codex' && (registrationChanged || (backup && cmd.args[1] === 'add'))) codexCacheChanged = true;
      await execute(context, cmd);
      if (agent !== 'cursor' && cmd.args[1] === 'marketplace' && cmd.args[2] !== 'remove') await verifyCurrent(context, agent, source, await inventory(context, agent), true, name);
    }
    if (operation === 'uninstall') {
      if (agent !== 'cursor') {
        native = await inventory(context, agent);
        if (native.plugins.some(row => row.id === `buddy@${name}`)) throw new Error('Native uninstall returned success but Buddy is still listed.');
        if (unregister && native.markets.some(row => row.name === oldMarket?.name)) throw new Error('Native marketplace removal returned success but the marketplace is still registered.');
      }
      const managed = Boolean(oldMarket?.local) && !external;
      if (source.kind === 'local' && (agent === 'cursor' || managed)) {
        backup = await removeSnapshot(context, agent, source.path);
        if (backup) result.actions.push(`Removed Buddy files preserved at ${backup}.`);
      }
      await persist(context, state, agent);
      result.message = unregister ? 'Buddy and its marketplace registration were removed.' : 'Buddy removed.';
      result.actions.push(...removalActions(agent, source, external ? oldMarket?.local : undefined));
      return result;
    }
    if (agent !== 'cursor') {
      native = await inventory(context, agent);
      await verifyCurrent(context, agent, source, native, true, name);
      const plugin = native.plugins.find(row => row.id === `buddy@${name}`);
      if (!plugin) throw new Error('The native command returned success but Buddy is not listed as installed.');
      result.version = plugin.version;
    } else result.status = 'needs-action';
    await persist(context, state, agent, { source, version: result.version, ...(agent === 'cursor' ? {} : { marketplace: name }) });
  } catch (error) {
    const failures: string[] = [];
    const cleanup = { ...context, signal: undefined, run: context.cleanupRun };
    if (backup && source.kind === 'local') {
      try {
        const displaced = await restoreSnapshot(cleanup, agent, source.path, backup);
        result.actions.push(`The previous local files were restored; their backup was kept at ${backup}.`);
        if (displaced) result.actions.push(`The replaced snapshot was preserved at ${displaced}.`);
      }
      catch (restoreError) { failures.push(`Snapshot rollback failed: ${message(restoreError)}`); }
    }
    if (registrationChanged && oldMarket && agent !== 'cursor') {
      try { await restoreMarketplace(cleanup, agent, oldMarket, source); result.actions.push('The previous marketplace registration was restored.'); }
      catch (restoreError) { failures.push(`Marketplace rollback failed: ${message(restoreError)}`); }
    }
    if (codexCacheChanged && previousPlugin && target && oldMarket) {
      try {
        if (failures.length) throw new Error('The prior snapshot or marketplace was not restored.');
        await recoverCodexCache(cleanup, target, oldMarket, previousPlugin);
        result.actions.push('The active Codex cache was refreshed from the previous local marketplace and verified.');
      } catch (restoreError) {
        failures.push(`Active Codex cache recovery is incomplete: ${message(restoreError)}`);
        result.actions.push(`Check the previous source for ${oldMarket.name} with codex plugin marketplace list --json (expected ${oldMarket.local ?? oldMarket.repo}). After confirming that source and that Buddy should be enabled, run codex plugin add ${previousPlugin.id} --json.`);
      }
    }
    if (published && !backup && source.kind === 'local') {
      try {
        const root = snapshotPath(context, agent);
        const inUse = agent !== 'cursor' && (await inventory(cleanup, agent)).markets.some(market => market.local && resolve(market.local) === root);
        if (inUse) result.actions.push(`The native marketplace still uses the new snapshot at ${root}. Its files were kept.`);
        else {
          const retained = await removeSnapshot(cleanup, agent, source.path);
          if (retained) result.actions.push(`The incomplete installation's local files were preserved at ${retained}.`);
        }
      } catch (restoreError) { failures.push(`New snapshot rollback could not be verified: ${message(restoreError)}`); }
    }
    if (failures.length) throw new Error(`${message(error)} ${failures.join(' ')}`);
    throw error;
  }
  if (replace && oldMarket?.local) result.actions.push(`Original local source directory kept at ${oldMarket.local}; plugin identity buddy@${name} was preserved.`);
  result.message = agent === 'cursor' && source.kind === 'github' ? 'Marketplace updated; plugin installation is not verified.' : 'Buddy files are installed; the running agent was not reloaded.';
  result.actions.push(...actions(agent, source.kind === 'local'));
  if (agent === 'cursor' && changing && source.kind === 'github' && target?.source.kind === 'local') result.actions.push(`The local copy remains at ${snapshotPath(context, agent)}. After installing GitHub Buddy in Cursor, check marketplace precedence or disable the local copy in the native UI.`);
  return result;
}

/** Run selected targets independently, retaining truthful partial results and saved sources. */
export async function manage(context: Context, request: Request): Promise<Result[]> {
  checkCancelled(context);
  if (request.operation === 'doctor') return doctor(context, request.agents);
  let source: Source | undefined;
  if (request.operation === 'install') source = request.from && request.from !== 'github'
    ? { kind: 'local', path: request.dryRun ? resolve(request.from) : (await checkout(request.from, context)).path } : { kind: 'github' };
  const release = request.dryRun ? undefined : await lock(context);
  try {
    const state = await loadState(context.data);
    const results: Result[] = [];
    for (const agent of request.agents) {
      const result: Result = { agent, status: request.dryRun ? 'planned' : 'ok', commands: [], actions: [], message: '' };
      let cursorRelease: (() => Promise<void>) | undefined;
      try {
        checkCancelled(context);
        if (!request.dryRun && agent === 'cursor' && (source ?? state.targets.cursor?.source)?.kind === 'local') cursorRelease = await lockCursor(context);
        await one(context, state, request, result, source);
      } catch (error) {
        result.status = 'error'; result.message = message(error);
        result.actions.push('Inspect native plugin state before retrying; earlier operations may have completed.');
      } finally { await cursorRelease?.(); }
      results.push(result);
    }
    return results;
  } finally { await release?.(); }
}

/** Inspect selected harnesses concurrently, limiting each check to a shared four-second budget. */
export async function doctor(context: Context, selected: Agent[]): Promise<Result[]> {
  if (!selected.length) return [];
  const timeoutMs = 4_000;
  const deadline = performance.now() + timeoutMs;
  let statePending = true;
  const state = loadState(context.data).finally(() => { statePending = false; });
  return Promise.all(selected.map(async agent => {
    const controller = new AbortController();
    const signal = context.signal ? AbortSignal.any([context.signal, controller.signal]) : controller.signal;
    const pending = new Set<string>();
    const limited: Context = { ...context, signal, run: async cmd => {
      const remaining = Math.ceil(deadline - performance.now());
      if (remaining <= 0) throw new Error(`${agent} diagnostic exceeded its four-second budget.`);
      const probe = [cmd.bin, ...cmd.args].join(' ');
      pending.add(probe);
      try { return await context.run({ ...cmd, signal, timeoutMs: Math.min(cmd.timeoutMs ?? remaining, remaining) }); }
      finally { pending.delete(probe); }
    } };
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        const subject = statePending ? 'shared Buddy CLI state' : [...pending].join(', ') || 'local Buddy metadata';
        reject(new Error(`${agent} diagnostic timed out after four seconds while checking ${subject}.`));
        controller.abort();
      }, Math.max(0, deadline - performance.now()));
    });
    try { return await Promise.race([state.then(saved => inspectDoctor(limited, agent, saved)), expired]); }
    catch (error) { return { agent, status: 'error' as const, commands: [], actions: [], message: message(error) }; }
    finally { clearTimeout(timer); controller.abort(); }
  }));
}

async function inspectDoctor(context: Context, agent: Agent, state: State): Promise<Result> {
  const version = (await execute(context, command(agent, ['--version']))).trim();
  const target = state.targets[agent];
  if (target?.source.kind === 'local' && !await assertOwned(snapshotPath(context, agent), context, agent, target.source.path)) throw new Error('The managed local snapshot is missing.');
  if (agent === 'cursor') {
    let local = target?.source.kind === 'local';
    if (!target) {
      try {
        await lstat(snapshotPath(context, agent));
        await verifyBuddyDirectory(snapshotPath(context, agent), agent);
        local = true;
      } catch (error) { if (!object(error) || error.code !== 'ENOENT') throw error; }
    }
    return { agent, status: 'needs-action', source: target?.source, version: target?.version, commands: [],
      message: `${version}; ${local && !target ? 'Existing local Buddy detected; attach a checkout with buddy install --agent cursor --from /path/to/buddy. ' : ''}Cursor plugin installation and loaded version require a check in Customize.`, actions: [] };
  }
  const native = await inventory(context, agent, true);
  if (target) await verifyCurrent(context, agent, target.source, native, true, target.marketplace);
  const found = target ? undefined : await existing(context, agent, native);
  const source = target?.source ?? found?.target.source;
  if (target && native.plugins.length === 0) throw new Error('Buddy is recorded but is not installed in the native client.');
  const plugin = native.plugins[0];
  for (const bin of ['jq', 'zsh']) await execute(context, { bin, args: ['--version'] });
  const notes = plugin ? actions(agent, source?.kind === 'local') : [];
  if (found?.external) notes.push(`Existing local Buddy at ${found.market.local}. Run buddy install --agent ${agent} --from /path/to/buddy to attach a checkout while preserving its identity.`);
  if (plugin && plugin.enabled !== true) notes.push(plugin.enabled === false ? 'Buddy is disabled in user settings; leave it disabled or enable it in the native client.' : 'The enabled state is not recorded; check native settings and policy.');
  return { agent, status: found?.external || (plugin && plugin.enabled !== true) ? 'needs-action' : 'ok', source, version: plugin?.version, commands: [],
    message: `${version}; ${plugin ? `Buddy ${plugin.version ?? 'version unknown'} (user installation metadata; loaded state unverified)` : 'Buddy is not installed'}.`,
    actions: notes };
}
