# Develop Buddy locally

This page is for Buddy maintainers. For installation from GitHub, see the [README](../README.md#install-and-update). The Buddy CLI is the command reference:

```bash
buddy --help
buddy install --help
```

## Run the CLI from a checkout

In the Buddy checkout, install dependencies and link the `buddy` command. npm builds the CLI automatically:

```bash
npm ci
npm link
buddy install --agent claude --from .
```

Keep the checkout while the command is linked. Run `npm run build` after changing the CLI source.

If your npm configuration disables lifecycle scripts, run `npm run build` after `npm ci` and before `npm link`.

## Install a snapshot of a checkout

To test a snapshot of this checkout instead of GitHub `main`:

```bash
buddy install --agent codex --from .
buddy update --agent codex
```

Local Claude Code installs require version 2.1.289 or later. Refresh the snapshot after editing Buddy's skills, agents, or hooks.

Existing local Buddy installations keep their marketplace names and plugin settings when adopted. Codex and Claude source directories stay intact; an existing Cursor copy gets a full backup before refresh. Later updates use the selected checkout. A copied installation with no recorded checkout needs `install --from .` once to attach its source. Disabled Claude local plugins can refresh in place. Codex refresh stops if its native command would enable a disabled plugin.

Native installs from the `buddy` marketplace and local `buddy-local` installations have separate sources and identities. Keep the qualified plugin name when maintaining a `buddy-local` installation.

## Change the recorded source

To change a recorded checkout or switch between GitHub and local sources, preview the change with `install --from <source> --migrate --dry-run`, then remove `--dry-run` to apply it. Migration preserves Codex and Claude plugin identities. Their local `buddy@buddy-local` installations cannot switch to GitHub's `buddy@buddy` identity automatically; the CLI reports the required native action before changing anything. Cursor source changes require native UI completion; the CLI reports any remaining local copy.

## Check installations

`buddy doctor --agent all` checks harnesses in parallel with a shared four-second timeout. A stalled check reports what it was waiting for alongside the other harness results.

## Automation and local state

- CLI state lives in `~/.buddy/cli`. `BUDDY_HOME` selects another Buddy root; CLI state then lives in `$BUDDY_HOME/cli`. Keep the same root for later operations. The Claude Code mod uses Claude-managed state.
- Adoption, replacement, and removal can leave backups in `~/.buddy/cli/backups` (or `$BUDDY_HOME/cli/backups`). The CLI reports the paths and keeps the backups after success or rollback. Close any editors using old plugin files before removing backups you no longer need.
- If Cursor is on a different filesystem from `BUDDY_HOME`, its previous copy stays in `~/.cursor/plugins/buddy-cli-backups`, outside local plugin discovery.
- Dry-run uses saved Buddy CLI state to preview commands. It labels adoption steps that still need native verification.
- Exit codes: `0` applied/planned, `1` error, `2` manual action required, `130` cancelled. Inspect each agent's result after a partial failure.
- A marketplace install can take precedence over a local Cursor copy; organization policy can block local plugins.

## Load the live checkout for one session

These native options do not create a persistent Buddy CLI installation:

```bash
claude --plugin-dir "$(pwd)"
cursor-agent --plugin-dir "$(pwd)"
```
