import { Command, CommanderError, Option } from 'commander';
import { isCancel, multiselect } from '@clack/prompts';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';
import { manage } from './manager.ts';
import { runner } from './process.ts';
import { agents, message, object } from './types.ts';
import type { Agent, Operation } from './types.ts';

declare const __BUDDY_VERSION__: string;

const json = process.argv.includes('--json');
const controller = new AbortController();
const cancel = () => controller.abort();
process.on('SIGINT', cancel);
process.on('SIGTERM', cancel);

const descriptions: Record<Operation, string> = {
  install: 'Install Buddy from GitHub main or a local checkout',
  update: 'Update Buddy from each agent’s recorded source',
  uninstall: 'Remove Buddy; native uninstall can discard saved plugin options',
  doctor: 'Check Buddy sources, installed files, and native plugin records',
};

const program = new Command().name('buddy').description('Manage Buddy in Codex, Claude Code, and Cursor.')
  .version(__BUDDY_VERSION__).exitOverride()
  .configureOutput({ writeErr: text => { if (!json) process.stderr.write(text); } });

for (const operation of ['install', 'update', 'uninstall', 'doctor'] as const) {
  const subcommand = program.command(operation).description(descriptions[operation])
    .addOption(new Option('--agent <agent>', 'Target agent; all selects all three').choices([...agents, 'all']))
    .option('--json', 'Output one JSON result without prompts or progress UI');
  if (operation !== 'doctor') subcommand.option('--dry-run', 'Show planned operations without running native commands or writing files');
  if (operation === 'install') subcommand.option('--from <source>', 'Buddy checkout root, or github for published source', 'github')
    .option('--migrate', 'Approve a source change while preserving the existing native plugin identity');
  subcommand.action(async (raw: unknown) => {
    if (!object(raw)) throw new Error('Invalid command options.');
    let selected: Agent[];
    if (raw.agent === 'all' || (operation === 'doctor' && raw.agent === undefined)) selected = [...agents];
    else if (typeof raw.agent === 'string') selected = agents.filter(agent => agent === raw.agent);
    else {
      if (!process.stdin.isTTY || !process.stderr.isTTY || json) throw new Error('Use --agent codex, claude, cursor, or all in a non-interactive run.');
      const choice = await multiselect<Agent>({
        message: 'Which agents should Buddy manage?',
        options: agents.map(value => ({ value, label: value === 'claude' ? 'Claude Code' : value === 'codex' ? 'Codex' : 'Cursor' })),
        required: true,
        output: process.stderr,
        signal: controller.signal,
      });
      if (isCancel(choice)) { process.exitCode = 130; return; }
      selected = choice;
    }
    // Leave Ctrl+C as a terminal signal while the operation holds locks.
    const from = typeof raw.from === 'string' ? raw.from : undefined;
    const progress = operation !== 'install' ? descriptions[operation]
      : from === undefined || from === 'github' ? 'Install Buddy from GitHub main (leszekgruchala/buddy)' : `Install Buddy from local checkout ${resolve(from)}`;
    if (!json && process.stderr.isTTY) process.stderr.write(`${progress}…\n`);
    const home = resolve(homedir());
    const results = await manage({ home, data: resolve(process.env.BUDDY_HOME || join(home, '.buddy'), 'cli'), run: runner(controller.signal), cleanupRun: runner(undefined, 15_000), signal: controller.signal,
      claudeConfig: process.env.CLAUDE_CONFIG_DIR }, {
      operation, agents: selected, from, dryRun: raw.dryRun === true, migrate: raw.migrate === true,
    });
    if (json) process.stdout.write(JSON.stringify({ version: __BUDDY_VERSION__, results }) + '\n');
    else for (const result of results) {
      console.log(`${result.agent}: ${result.status} — ${result.message}`);
      if (raw.dryRun) for (const cmd of result.commands) console.log(`  ${[cmd.bin, ...cmd.args].map(arg => JSON.stringify(arg)).join(' ')}`);
      for (const action of result.actions) console.log(`  ${action}`);
    }
    process.exitCode = controller.signal.aborted ? 130 : results.some(result => result.status === 'error') ? 1 : results.some(result => result.status === 'needs-action') ? 2 : 0;
  });
}

try {
  if (process.argv.length === 2) program.help();
  await program.parseAsync(process.argv);
} catch (error) {
  if (error instanceof CommanderError && error.exitCode === 0) process.exitCode = 0;
  else {
    if (json) console.log(JSON.stringify({ version: __BUDDY_VERSION__, error: message(error), results: [] }));
    else if (!(error instanceof CommanderError)) console.error(`buddy: ${message(error)}`);
    process.exitCode = controller.signal.aborted ? 130 : 1;
  }
} finally {
  process.removeListener('SIGINT', cancel);
  process.removeListener('SIGTERM', cancel);
}
