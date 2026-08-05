# Local Harness Validation

Use this guide to validate the current Buddy checkout, including uncommitted local changes. Run every command from the repository root.

Static validation proves the checked-in schemas, shared components, hook protocol, and policy regression suite. A fresh harness session is still required to prove that the harness discovers, trusts, and executes the local plugin snapshot.

## Shared source gate

Run this after every repository change:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
git diff --check
```

The unified validator checks Agent Skills, agents, all three manifests and marketplaces, the shared hook contract, zsh syntax, hook allow/deny behavior, and Claude Code's strict plugin validator when that CLI is installed.

To test the hook policy without involving a harness, send the shared entrypoint one safe and one denied command:

```bash
jq -nc --arg command "git status" --arg cwd "$PWD" \
  '{tool_name:"Bash",tool_input:{command:$command},cwd:$cwd}' \
  | /bin/zsh hooks/run-pretooluse.zsh \
  | jq .

jq -nc --arg command "terraform apply -help" --arg cwd "$PWD" \
  '{tool_name:"Bash",tool_input:{command:$command},cwd:$cwd}' \
  | /bin/zsh hooks/run-pretooluse.zsh \
  | jq .
```

The first response should allow execution by returning an empty object. The second should contain `hookSpecificOutput.permissionDecision: "deny"`. This proves the adapter and policy, not plugin registration.

## Codex

Codex loads plugin snapshots through configured marketplaces. The checked-in Codex marketplace intentionally points to GitHub `main`, so reinstalling `buddy@buddy` cannot validate branch changes. Use a disposable local marketplace with a unique name instead.

First inspect existing installations:

```bash
codex plugin list --json
```

If `buddy@buddy` is installed, temporarily remove it so two Buddy snapshots do not register duplicate skills or hooks:

```bash
codex plugin remove buddy@buddy
```

Create a disposable marketplace and copy the current working tree into it. The unique marketplace name prevents Codex from reusing an older cached snapshot:

```bash
buddy_validation_root="$(mktemp -d /tmp/buddy-codex-local.XXXXXX)"
buddy_validation_marketplace="buddy-local-$(date -u +%Y%m%d%H%M%S)"

mkdir -p \
  "$buddy_validation_root/.agents/plugins" \
  "$buddy_validation_root/plugins/buddy"

rsync -a --delete \
  --exclude .git \
  --exclude .ai \
  ./ "$buddy_validation_root/plugins/buddy/"

jq -n --arg name "$buddy_validation_marketplace" '{
  name: $name,
  interface: {displayName: "Buddy local validation"},
  plugins: [{
    name: "buddy",
    source: {source: "local", path: "./plugins/buddy"},
    policy: {installation: "AVAILABLE", authentication: "ON_INSTALL"},
    category: "Productivity"
  }]
}' > "$buddy_validation_root/.agents/plugins/marketplace.json"

codex plugin marketplace add "$buddy_validation_root"
codex plugin add "buddy@$buddy_validation_marketplace"
```

Start a new Codex task. Open `/hooks`, confirm the Buddy `PreToolUse` hook comes from the disposable marketplace, review and trust it, then ask Codex to run `terraform apply -help`. The command must be denied before Terraform starts.

After testing, remove the disposable installation and marketplace. If you removed the normal installation, restore it:

```bash
codex plugin remove "buddy@$buddy_validation_marketplace"
codex plugin marketplace remove "$buddy_validation_marketplace"
codex plugin add buddy@buddy
```

The temporary directory can be discarded after the marketplace is removed. Repeat the copy-and-install flow with a new marketplace name after further local changes.

## Claude Code

Validate the manifest with Claude Code's first-party strict validator, then load the checkout directly for one session:

```bash
claude plugin validate --strict .
claude --plugin-dir .
```

In that fresh session, inspect the loaded Buddy components and hooks, then ask Claude Code to run `terraform apply -help`. The shared `PreToolUse` hook must deny it before Terraform starts. Exit the session to stop using the local checkout; this flow does not install or replace a marketplace plugin.

## Cursor Agent

Cursor Agent can load the checkout directly:

```bash
cursor-agent --plugin-dir .
```

In the fresh agent session, ask it to run `terraform apply -help`. The shared `PreToolUse` plugin hook must deny the command. If it does not, inspect Cursor's hook logs for the resolved command under `hooks/run-pretooluse.zsh`.

Cursor maps Buddy's Claude-compatible `PreToolUse` event and `Bash` matcher to its native hook protocol. Do not use Cursor's `Loaded N user hooks` message as proof of plugin registration; that count covers user hooks, not plugin hooks.

## Cursor desktop

Cursor desktop loads development plugins from a real directory under `~/.cursor/plugins/local/`; a symlink to the checkout is rejected. Copy the current working tree, reload the window, and confirm Buddy is enabled under **Customize → Plugins**:

```bash
mkdir -p ~/.cursor/plugins/local/buddy
rsync -a --delete \
  --exclude .git \
  --exclude .ai \
  ./ ~/.cursor/plugins/local/buddy/
```

Run **Developer: Reload Window**, start a new agent chat, and ask it to run `terraform apply -help`. Confirm the denial in the agent and Buddy activity in the **Hooks output channel**. Recopy and reload after every local change; an existing chat may retain its previous plugin snapshot.

## What each layer proves

| Layer | Proves | Does not prove |
|---|---|---|
| Unified repository validator | Package shape, shared hook protocol, policy behavior | Live harness discovery or trust |
| Direct hook smoke test | Adapter and engine allow/deny output | Plugin registration |
| Fresh local harness session | Discovery, path resolution, trust, live enforcement | Marketplace publication or cloud-agent enforcement |
| Installed marketplace release | Packaged release behavior | Uncommitted branch changes |
