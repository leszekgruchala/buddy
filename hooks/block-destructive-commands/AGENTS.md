# Destructive-command hook rules

## Architecture

- `block-destructive-shell.zsh` is the shared policy engine and emits the flat decision consumed by the adapter.
- `block-destructive-shell-pretooluse.zsh` is the single adapter for the Codex, Claude Code, and Cursor `PreToolUse` contracts.
- `hooks/run-pretooluse.zsh` is the shared entrypoint; it resolves the adapter from `${0:A:h}` and denies shell execution if the installed hook files are incomplete.
- Claude Code and Cursor point explicitly to the shared root `hooks/hooks.json`. Codex uses that fixed default path because the installed Codex plugin validator rejects a manifest `hooks` field.
- Keep one shared policy implementation. Add another adapter only when a harness contract actually differs.

## Non-negotiable constraints

- Use native zsh only. Keep `#!/bin/zsh` and `emulate -L zsh`.
- Do not introduce Python, Node.js, Ruby, Perl, or another runtime into production hooks.
- Apart from invoking zsh itself, `jq` and `git` are the only allowed external production dependencies; resolve and validate their binaries explicitly.
- Production hooks must not enable `errexit`. Handle every expected failure explicitly, emit a structured decision, and exit `0`.
- Fail closed on malformed input, missing required binaries, parser failures, or invalid adapter responses.
- Keep agent-facing denial messages actionable: do not retry or work around the policy, and tell the user what they must review or run themselves.
- Do not use `eval` or execute the command being inspected.
- Resolve sibling production hooks from `${0:A:h}` so installed plugin paths work.
- Expected hook failures must return an intentional structured denial instead of relying on a harness process failure to block.

## Safety policy

- Match fully qualified executables, supported wrappers, compound commands, and nested `sh -c`-style invocations.
- Avoid substring matching that turns harmless arguments into destructive commands.
- Allow file removal only for direct commands with explicit literal targets inside the active Git worktree.
- Deny deletion of the worktree root, Git administrative paths, outside paths, dynamic paths, globs, ambiguous compound or nested deletion, and symlink traversal.
- Keep destructive infrastructure, container, cloud, database, and SQL coverage represented in the validator.

## Required verification

- Run `zsh -n` for every zsh file in this directory.
- Run `zsh hooks/block-destructive-commands/validate-block-destructive-shell.zsh`.
- Prove production zsh files contain no Python reference.
- Verify shared `PreToolUse` decisions exit `0`, emit valid JSON, and include actionable guidance on every denial.
- Run the repository-wide validator and `git diff --check`.
