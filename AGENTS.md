# Buddy Repository Instructions

This repository packages the `buddy` AI coding support assets as a Codex plugin.

## Repository Contracts

1. Keep the plugin id `buddy`.
2. Keep this repository root as the plugin root.
3. Keep Codex marketplace entries in `.agents/plugins/marketplace.json`.
4. Keep `README.md` aligned with the actual local registration commands.

## Editing Rules

1. Make surgical changes only.
2. Do not rename plugin ids, marketplace names, paths, or command examples unless requested.
3. Do not delete copied agents, skills, or marketplace files unless requested.
4. Do not edit when the user is only asking for analysis or recommendations.
5. Do not put absolute paths to personal/local helper scripts in repository docs.
6. Do not invent first-party CLI commands; verify documented commands with `--help` before adding them.
7. Prefer current first-party CLI tooling over local scripts for documented package checks.
8. End text files with exactly one trailing newline.

## Validation

After packaging changes, run applicable checks:

1. Parse JSON files:
   - `.codex-plugin/plugin.json`
   - `.agents/plugins/marketplace.json`
2. Check Codex marketplace ingestion with current CLI commands:
   ```bash
   codex plugin marketplace add .
   codex plugin list --available --json
   ```
3. Check that plugin ids and marketplace paths still agree.
4. Check text-file trailing newlines.

## Scope

This root `AGENTS.md` is maintainer guidance for this repository. It is not automatically inherited by projects that install the plugin.
