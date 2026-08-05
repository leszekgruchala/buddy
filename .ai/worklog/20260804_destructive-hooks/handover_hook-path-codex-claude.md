# Handover: Align Codex and Claude hook paths with Cursor launcher pattern

**Date:** 2026-08-05
**Repo:** `/Users/lgr/projects/pirum/buddy`
**Audience:** Codex agent (or any implementor) continuing destructive-command hook work
**Status:** Resolved locally; Codex + Claude now use a shared self-locating launcher

## Resolution

- Added `hooks/run-pretooluse.zsh`, which captures `${0:A:h}` at script scope, resolves the adapter relative to the installed launcher, and emits a structured denial if the adapter is missing.
- Kept `${CLAUDE_PLUGIN_ROOT}` in `hooks/hooks.json`: it is Claude Code's native plugin-root placeholder, and current Codex documentation explicitly guarantees it as a compatibility variable alongside `PLUGIN_ROOT`.
- Added validator coverage that invokes both launchers from outside the plugin directory and checks an allowed command and a denied command.
- Added no guessed Codex or Claude installation fallback paths.
- Corrected Cursor's existing launcher to capture `${0:A:h}` at script scope too; its local-install fallback had masked the same function-local `$0` resolution bug.

---

## Goal

Apply the same **self-locating hook entrypoint** pattern used for Cursor to the shared Codex and Claude Code `PreToolUse` registry, so hook commands survive plugin install path differences and do not depend solely on harness env-var substitution or workspace CWD.

---

## Background: what was wrong on Cursor

### Symptom

After `rsync` to `~/.cursor/plugins/local/buddy/` and window reload, Buddy **skills** loaded but the **`beforeShellExecution` hook did not appear** under Customize → Hooks.

### Root causes identified

1. **Install vs discovery:** Copying to `~/.cursor/plugins/local/` auto-discovers skills/agents, but hooks register through the **plugin manifest** and require Buddy to be **enabled in Customize → Plugins** (not just present on disk).
2. **Relative command path:** The original registry invoked the policy engine directly:
   ```json
   "/bin/zsh \"./hooks/block-destructive-commands/block-destructive-shell.zsh\""
   ```
   That path only works when the hook runner’s CWD resolves `./hooks/...` correctly (plugin root or a repo that happens to contain `hooks/`). From other CWDs it fails with “can't open input file”.

### Cursor fix already applied (uncommitted / local)

| File | Change |
|---|---|
| `hooks/cursor/run-before-shell-execution.zsh` | **New** thin launcher. Resolves engine via `${0:A:h}/../block-destructive-commands/block-destructive-shell.zsh`, with fallback to `~/.cursor/plugins/local/buddy/hooks/block-destructive-commands/block-destructive-shell.zsh`. Emits structured deny if unavailable. |
| `hooks/cursor/hooks.json` | Command now points at launcher: `"/bin/zsh \"./hooks/cursor/run-before-shell-execution.zsh\""` |
| `scripts/validate.py` | Expected Cursor contract updated; launcher included in `zsh -n` syntax checks |
| `hooks/block-destructive-commands/AGENTS.md` | Documents Cursor entrypoint |
| `README.md`, `docs/harness-compatibility.md` | Clearer Cursor install/verify steps (Customize → Plugins, Hooks tab, output channel) |

Validation passes:
```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Functional test (launcher → engine):
```bash
echo '{"command":"terraform apply -help","cwd":"/path/to/repo"}' | \
  /bin/zsh hooks/cursor/run-before-shell-execution.zsh
# expect permission: deny
```

---

## Current Codex and Claude state (needs work)

### Shared registry

**File:** `hooks/hooks.json`

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Shell|local_shell|shell|shell_command|exec_command",
        "hooks": [
          {
            "type": "command",
            "command": "/bin/zsh \"${CLAUDE_PLUGIN_ROOT}/hooks/block-destructive-commands/block-destructive-shell-pretooluse.zsh\"",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

### Harness discovery

| Harness | Manifest hooks field | Registry location |
|---|---|---|
| **Codex** | none (default discovery) | root `hooks/hooks.json` |
| **Claude Code** | none (default discovery) | root `hooks/hooks.json` |
| **Cursor** | `"hooks": "./hooks/cursor/hooks.json"` | separate schema |

Validator enforces: Codex and Claude manifests must **not** include a `hooks` field.

### Adapter and engine (already self-locate internally)

- `hooks/block-destructive-commands/block-destructive-shell-pretooluse.zsh` — PreToolUse adapter; resolves engine with `${0:A:h}/block-destructive-shell.zsh`
- `hooks/block-destructive-commands/block-destructive-shell.zsh` — shared policy engine (Cursor `beforeShellExecution` + engine for adapter)

The **registry command** still jumps straight to the adapter using `${CLAUDE_PLUGIN_ROOT}`. That is documented for Claude and listed as a Codex compatibility alias, but:

- Codex primary variable is **`${PLUGIN_ROOT}`** (see research + official Codex hook docs)
- If env substitution fails or plugin root differs from expectation, the hook fails before the adapter’s `${0:A:h}` logic runs
- No fallback path exists (unlike the new Cursor launcher)
- Parity with Cursor’s “entrypoint + resolve + fail-closed deny” pattern is missing

---

## Recommended Codex + Claude fix

Mirror the Cursor pattern with a **shared PreToolUse launcher** at the hooks root (sibling of `hooks.json`).

### 1. Add `hooks/run-pretooluse.zsh`

Responsibilities:

- `emulate -L zsh`; do **not** enable `errexit`
- Resolve adapter via `${0:A:h}/block-destructive-commands/block-destructive-shell-pretooluse.zsh`
- Optional documented fallbacks (only if verifiable; do not invent paths):
  - Cursor local copy is **not** relevant here
  - Consider whether Codex/Claude have stable local install paths on the maintainer’s machine; if not, rely on `${0:A:h}` after the harness invokes the launcher by absolute/substituted path
- If adapter cannot be resolved: emit valid **PreToolUse deny JSON** (same shape as `block-destructive-shell-pretooluse.zsh` denials) and exit `0`
- Otherwise: `exec /bin/zsh "$adapter"` (preserve stdin for PreToolUse payload)

Sketch:

```zsh
#!/bin/zsh
# Shared Codex and Claude Code PreToolUse entrypoint.
emulate -L zsh
unsetopt errexit

resolve_adapter() {
  local candidate="${0:A:h}/block-destructive-commands/block-destructive-shell-pretooluse.zsh"
  [[ -f $candidate ]] && print -r -- "$candidate" && return 0
  return 1
}

typeset adapter
if ! adapter=$(resolve_adapter); then
  print -r -- '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Blocked shell execution because the Buddy PreToolUse hook is unavailable. Do not retry; tell the user to check plugin installation and /hooks trust (Codex) or /reload-plugins (Claude)."}}'
  exit 0
fi

exec /bin/zsh "$adapter"
```

### 2. Update `hooks/hooks.json` command

Point at the launcher, not the adapter directly.

**Preferred command string** (verify against installed Codex + Claude CLI help before locking):

```json
"command": "/bin/zsh \"${CLAUDE_PLUGIN_ROOT}/hooks/run-pretooluse.zsh\""
```

**Codex compatibility:** Official docs state hook commands receive `${PLUGIN_ROOT}` and compatibility variables including `${CLAUDE_PLUGIN_ROOT}`. If Codex does not substitute `${CLAUDE_PLUGIN_ROOT}` on the maintainer’s installed version, use `${PLUGIN_ROOT}` instead or confirm both are equivalent on the installed CLI. **Do not guess** — check current Codex hook docs and installed behavior.

Do **not** change the PreToolUse matcher, timeout, or nested hook structure unless harness docs require it.

### 3. Update `scripts/validate.py`

- Change `expected_shared_hooks` command to the new launcher path
- Add `ROOT / "hooks/run-pretooluse.zsh"` to `hook_files` for `zsh -n` syntax check
- Keep regression suite unchanged (`validate-block-destructive-shell.zsh` still tests engine + adapter directly)

### 4. Update docs

| File | Update |
|---|---|
| `hooks/block-destructive-commands/AGENTS.md` | Document `hooks/run-pretooluse.zsh` as shared Codex/Claude entrypoint |
| `docs/harness-compatibility.md` | Destructive-command guard + Codex/Claude sections: registry invokes launcher; `${PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_ROOT}` note |
| `README.md` | If install/trust steps need tightening after testing |

### 5. Do **not** change unless harness docs require

- `.codex-plugin/plugin.json` — no `hooks` field (validator forbids it)
- `.claude-plugin/plugin.json` — no `hooks` field
- `block-destructive-shell-pretooluse.zsh` internal `${0:A:h}` engine resolution (already correct)
- Cursor files (`hooks/cursor/*`) — already done

---

## Architecture after fix (target)

```text
hooks/
├── hooks.json                           # Codex + Claude PreToolUse registry
├── run-pretooluse.zsh                   # NEW shared entrypoint
├── block-destructive-commands/
│   ├── block-destructive-shell.zsh      # policy engine
│   ├── block-destructive-shell-pretooluse.zsh  # PreToolUse adapter
│   └── validate-block-destructive-shell.zsh
└── cursor/
    ├── hooks.json                       # Cursor registry (done)
    └── run-before-shell-execution.zsh   # Cursor entrypoint (done)
```

---

## Constraints (from repo `AGENTS.md` and `hooks/block-destructive-commands/AGENTS.md`)

- Native **zsh** only in production hooks; no Python/Node/etc.
- Production hooks: no `errexit`; fail closed with structured JSON; exit `0`
- Only external deps besides zsh: **`jq`** and **`git`** (in engine/adapter, not necessarily launcher)
- Surgical changes only; keep plugin id `buddy`; do not rename marketplace paths
- End text files with exactly one trailing newline
- After every change:
  ```bash
  UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
  ```

---

## Verification checklist (implementor)

### Static

- [x] `zsh -n hooks/run-pretooluse.zsh`
- [x] `zsh hooks/block-destructive-commands/validate-block-destructive-shell.zsh` → `42 passed, 0 failed`
- [x] `uv run scripts/validate.py` passes
- [x] `claude plugin validate --strict .` if Claude CLI available

### Codex

- [ ] Reinstall or refresh local plugin if needed:
  ```bash
  codex plugin remove buddy@buddy
  codex plugin add buddy@buddy
  ```
- [ ] Restart Codex; open `/hooks`; review and **trust** the updated hook definition
- [ ] Deny test: attempt `terraform apply -help` via agent shell → blocked

### Claude Code

- [ ] Restart Claude Code or `/reload-plugins`
- [ ] Deny test: attempt `terraform apply -help` via agent shell → blocked

### Cursor (regression)

- [ ] No changes required if Codex/Claude work is scoped correctly
- [ ] Re-run Cursor launcher deny test if any shared files touched

---

## Open questions for implementor

1. **Codex variable:** Confirm on installed CLI whether `${CLAUDE_PLUGIN_ROOT}`, `${PLUGIN_ROOT}`, or both are substituted in `hooks/hooks.json` commands. Pick the canonical one for the checked-in contract; document the boundary in `docs/harness-compatibility.md`.
2. **Fallback paths:** Cursor uses `~/.cursor/plugins/local/buddy/...`. Codex/Claude local install paths may not be stable enough for fallbacks — prefer `${0:A:h}` after harness resolves the launcher path; add fallbacks only if documented and verified.
3. **Cloud:** Codex cloud and Claude Code web hook carry-over remains **unverified** (see research worklog). Do not expand cloud claims in README.

---

## Related files (quick index)

| Path | Role |
|---|---|
| `hooks/hooks.json` | **Change** — point command at launcher |
| `hooks/run-pretooluse.zsh` | **Create** — shared entrypoint |
| `hooks/block-destructive-commands/block-destructive-shell-pretooluse.zsh` | Keep — adapter |
| `hooks/block-destructive-commands/block-destructive-shell.zsh` | Keep — engine |
| `hooks/cursor/run-before-shell-execution.zsh` | Done — Cursor entrypoint |
| `hooks/cursor/hooks.json` | Done — Cursor registry |
| `scripts/validate.py` | **Change** — expected shared contract + syntax list |
| `.ai/worklog/20260804_destructive-hooks/research_destructive-hooks.md` | Research context |

---

## Suggested commit message (when done)

```
Align Codex and Claude PreToolUse hooks with self-locating entrypoint.

Route hooks/hooks.json through hooks/run-pretooluse.zsh so registry
commands match the Cursor launcher pattern and fail closed when the
adapter cannot be resolved.
```
