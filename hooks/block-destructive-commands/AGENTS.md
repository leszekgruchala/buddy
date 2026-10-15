# Accident guard rules

## Purpose

- The guard stops agents from running a short list of commands that are hard or impossible to undo.
- It is not a security boundary. It does not stop a determined bypass, scripts, or other interpreters. File-system protection belongs to the harness sandbox.
- A false positive breaks the work of the user. A missed rare command is acceptable. When in doubt, allow.

## Architecture

- `block-destructive-shell.zsh` is the shared policy engine and emits the flat decision consumed by the adapter.
- `block-destructive-shell-pretooluse.zsh` is the single adapter. It reads the input of each harness and returns the decision in that harness's output format.
- `hooks/run-pretooluse.zsh` is the shared entrypoint. It takes the harness name (`claude`, `codex`, or `cursor`), resolves the adapter from `${0:A:h}`, and denies shell execution if the installed hook files are incomplete.
- Each harness has its own hook file: `hooks/hooks.json` for Claude Code, which always loads the default file; `hooks/codex-hooks.json` and `hooks/cursor-hooks.json` through the Codex and Cursor manifests, which replace the default file.
- Ask only where the harness enforces `ask`: Claude Code `PreToolUse` and Cursor `beforeShellExecution`. Codex runs the command on `ask`, and Cursor `preToolUse` ignores `ask`, so Codex denies. An unknown harness name, or input with another harness's marker (`turn_id` for Codex, `cursor_version` for Cursor), denies.
- `docs/harness-compatibility.md` records the evidence for each harness decision. Re-check it against the official docs before changing a decision.
- Keep one shared policy implementation. Add another adapter only when a harness contract actually differs.

## Non-negotiable constraints

- Use native zsh only. Keep `#!/bin/zsh` and `emulate -L zsh`.
- Do not introduce Python, Node.js, Ruby, Perl, or another runtime into production hooks.
- Apart from invoking zsh itself, `jq` is the only allowed external production dependency; resolve and validate its binary explicitly.
- Production hooks must not enable `errexit`. Handle every expected failure explicitly, emit a structured decision, and exit `0`.
- Deny only when the hook itself cannot work: missing `jq`, unreadable or malformed hook input, missing hook files, or an invalid adapter response.
- Do not use `eval`, and do not execute or expand the command being inspected.
- Resolve sibling production hooks from `${0:A:h}` so installed plugin paths work.
- Keep denial messages actionable: do not retry or work around the guard, and give the user the exact command to review and run.

## Change rules

These rules exist because the earlier fail-closed parser blocked ordinary commands almost every day.

1. Never deny because of parse uncertainty. Invalid syntax, unknown heredoc forms, unknown wrappers, and unusual quoting must allow the command. The real shell reports real syntax errors.
2. Do not add a syntax gate. `zsh -n` is not a pure parser: it still resolves `=word` command paths.
3. Match only the command word and its subcommands or flags. Never match text in data: quoted arguments, messages, `echo` or `printf` data, comments, or heredoc bodies. The only data the guard reads is a heredoc or here-string that a shell or SQL client receives.
4. Add a rule only when all of these are true: the action is irreversible or changes shared or remote state, one command does the damage, and the match has a near-zero false-positive rate.
5. Do not add a rule that a harness sandbox already covers, such as general file deletion or writes outside the project.
6. Every rule needs a deny test and a near-miss allow test in `validate-block-destructive-shell.zsh`.
7. Before you fix a reported false positive, add the exact reported command to `allow_cases`, and confirm that it fails.
8. Keep analysis linear in the command size. Avoid whole-string substitutions such as `${var//pattern/}` on the command; they are slow on large input. Commands longer than the analysis limit are allowed.

## Required verification

- Run `zsh -n` for every zsh file in this directory.
- Run `zsh hooks/block-destructive-commands/validate-block-destructive-shell.zsh`.
- Prove production zsh files contain no Python reference.
- Run the repository-wide validator and `git diff --check`.
