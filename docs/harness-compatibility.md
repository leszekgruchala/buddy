# Harness Compatibility

Buddy keeps reusable behavior in root `skills/` and shared named-agent entrypoints in root `agents/`. Harness manifests point to those directories; they do not duplicate workflow instructions.

## Capability matrix

| Capability | Codex | Claude Code | Cursor |
|---|---|---|---|
| Agent Skills `SKILL.md` | Yes | Yes | Yes |
| Root `skills/` discovery | Manifest path | Manifest path/default | Manifest path/default |
| Root named agents | No plugin component | Yes | Yes |
| Root `agents/` schema | Not consumed | Rich Claude schema | Portable subset: `name`, `description` |
| Skill-triggered subagent | Orchestrator dispatch | Native/custom agents | Native/custom agents |
| Per-agent tool denial | Dispatch/sandbox dependent | Supported, but nonportable | Not in the common documented schema |
| Per-agent model selection | Dispatch API dependent | Supported | Harness dependent |
| Account-aware model discovery | `codex debug models` catalog | Interactive `/model` and organization policy | `cursor-agent models` catalog |
| Buddy model profile | Project or user scope | Project or user scope | Project or user scope |
| Commands | Use skills | Supported; skills preferred | Supported |
| Rules/project instructions | Project `AGENTS.md`, not plugin-shipped | Project `CLAUDE.md`, not plugin-shipped | Plugin `rules/` supported |
| Destructive-command hook | Root `PreToolUse` discovery | Root `PreToolUse` discovery | Manifest-selected `beforeShellExecution` |
| Hook runtime | `/bin/zsh`, `jq`, `git` | `/bin/zsh`, `jq`, `git` | `/bin/zsh`, `jq`, `git` |
| MCP root file | `.mcp.json` via manifest | `.mcp.json` | `mcp.json` |
| Plugin visual mark | `composerIcon` and `logo` | No supported image field | `logo` |
| Local plugin loading | Marketplace install | `claude --plugin-dir .` | Copy under `~/.cursor/plugins/local/` |

## Shared contracts

Each skill follows the Agent Skills standard: exact `SKILL.md`, standard `name` and `description` frontmatter, a non-empty instruction body, and on-demand references. Harness-only frontmatter stays out of shared skills.

Each specialist skill owns one phase. It cannot activate another Buddy skill unless the user explicitly requests the transition or the `develop` orchestrator explicitly dispatches it. Workers return to their caller instead of advancing themselves. `develop` may enable only stages required by the user's authorized task and must dispatch each stage with bounded scope and success criteria.

This gate is a workflow contract, not a universal security boundary. Claude can enforce stronger tool restrictions with Claude-only agent fields, but those fields are excluded because Cursor's documented portable agent schema guarantees only `name` and `description`. Codex and Cursor enforcement therefore depends on the live tool surface and sandbox.

### Destructive-command guard

Buddy keeps one zsh policy engine in `hooks/block-destructive-commands/block-destructive-shell.zsh`. Cursor invokes its native `beforeShellExecution` contract through `hooks/cursor/run-before-shell-execution.zsh`. Codex and Claude Code invoke `hooks/run-pretooluse.zsh`, which self-locates `block-destructive-shell-pretooluse.zsh`; that adapter translates their `PreToolUse` input and denial output to the same policy engine.

Codex and Claude Code discover the root `hooks/hooks.json`. Cursor selects `hooks/cursor/hooks.json` through `.cursor-plugin/plugin.json` because its event and response schema differs. Cursor keeps `failClosed: false`: expected failures are handled inside Buddy with structured decisions and exit `0`, while a harness or runtime failure does not disable every agent shell command.

The initial supported runtime is macOS 10.15 or newer with `/bin/zsh`, `jq`, and `git`. Missing dependencies, malformed input, parser failures, and invalid adapter responses deny shell execution with actionable guidance. The policy permits removal only for direct commands with explicit literal targets inside the active Git worktree and denies the worktree root, Git metadata, external or dynamic paths, globs, ambiguous compound or nested removal, and symlink traversal.

### Model profile and validation

Buddy keeps stage-to-tier policy and its maintained default model mappings in the plugin. Model choices can be stored in the project-owned `.buddy/model-profile.yaml` or the user-owned `~/.buddy/model-profile.yaml`. Each configured harness section supplies a complete `fast`, `balanced`, and `frontier` mapping in that harness's native representation; `inherit` is valid for any complete tier. Configuring one harness preserves sections for the others in the selected file.

No harness currently provides one native store that is simultaneously structured, writable by a portable Agent Skill, private to the user, preserved across plugin updates, and available to cloud agents:

| Harness | Harness-native personal storage | Portable skill access | Cloud availability | Fit for Buddy |
|---|---|---|---|---|
| Codex | Plugin data is available to hook commands | Not available to a pure skill | Not documented as synchronized | Not a portable profile store |
| Claude Code | Plugin `userConfig` can be substituted into skill content | Usable locally after configuration | Not propagated to Claude Code on the web | Possible local adapter, not a cross-harness store |
| Cursor | User Rules survive plugin updates and reach personal Cloud Agent sessions | Supplied as prompt context; no structured read/write interface for a skill | Yes, for personal User Rules | Useful manual context, not a programmatically managed profile |

A committed project file is therefore the simplest structured option that works consistently across local and cloud checkouts. Harness-native stores may later be added as adapters, but they should not become the canonical cross-harness contract.

#### Storage contract

`configure-models` asks where to save the profile before writing:

- **Project:** `.buddy/model-profile.yaml`. This is project-specific and available to cloud agents when committed and included in their checkout. It is shared repository policy, so it must not contain secrets or preferences a user does not want teammates to inherit.
- **User:** `~/.buddy/model-profile.yaml`. This is the user's reusable default across local projects. It survives plugin updates but is not automatically available to cloud agents, and writing outside the current workspace may require approval.

For the current harness, `model-policy` resolves a configured section in this order:

1. the project profile's current-harness section;
2. the user profile's current-harness section;
3. Buddy's packaged default maintained by the plugin author.

Precedence applies per harness section, not merely per file. For example, a project profile containing only `codex` must not hide the user's `cursor` section. A missing section falls through to the next source. A present but malformed or unavailable higher-priority section must be reported and inherited safely; Buddy must not silently replace it with a lower-priority concrete model. An explicit one-task model request remains a transient conversation instruction and is not persisted unless the user asks to update a profile.

The `configure-models` skill distinguishes profile/schema validity, account/catalog visibility, and live subagent dispatch compatibility. A first-party catalog supplies candidates but does not prove that the current dispatch surface accepts them. Team policy, plan limits, model retirement, and a narrower dispatch schema can still reject a catalog-visible model. Concrete values are stored only after dispatch validation; when the live schema accepts arbitrary strings, a bounded real probe requires approval because it may consume quota. Buddy never translates or silently substitutes identifiers.

Before dispatch, `model-policy` revalidates the exact configured value and fields. If they are invalid, incomplete, unsupported, or no longer accepted, Buddy omits the override, inherits the orchestrator model, reports the problem, and recommends reconfiguration.

When neither profile supplies the current harness, Buddy uses the packaged defaults and recommends `configure-models` once at the relevant top-level workflow without blocking dispatch. The user profile is local to the current machine and home directory; cloud, remote, and sandboxed workers do not receive it automatically, and home-directory access or writes may require approval. Buddy does not store user preferences in installed plugin files.

## Harness details

### Codex

`.codex-plugin/plugin.json` exposes root skills. Codex has no supported plugin `agents` field, so `develop` dispatches generic Codex subagents and explicitly names the required Buddy skill. Root `agents/` files are packaged but not registered as first-class Codex agents. Root `AGENTS.md` maintains this repository and is not inherited by projects installing Buddy.

Codex discovers Buddy's shared root `hooks/hooks.json` without a manifest `hooks` field. The registry invokes the shared launcher through `${CLAUDE_PLUGIN_ROOT}`, which Codex exports as a compatibility alias alongside its native `${PLUGIN_ROOT}`; the launcher then resolves the adapter relative to its own installed path. Plugin installation does not trust bundled hooks automatically: after installing or updating Buddy, restart Codex and use `/hooks` to review and trust the current hook definition.

Codex uses the shared `assets/buddy.svg` for both visual fields.

After checking the installed subcommand help, `codex debug models` provides the current Codex model catalog, including model slugs and supported reasoning levels. Buddy preserves Codex's separate `model` and optional `model_reasoning_effort` fields; it does not invent a combined slug. Catalog membership is only candidate discovery: the host-provided subagent dispatch schema may expose a narrower model or reasoning enum and remains authoritative.

### Claude Code

`.claude-plugin/plugin.json` points to root skills; Claude's validated manifest schema rejects an explicit `agents` path, so agents use Claude's default root `agents/` discovery. Claude exposes both as namespaced plugin components. Shared agent files intentionally use only the Cursor-compatible metadata subset, so they do not use Claude-only `skills`, `tools`, `disallowedTools`, `model`, or `isolation` fields. This trades Claude-specific enforcement for one shared agent definition.

Claude Code discovers the same root `hooks/hooks.json` and invokes the shared launcher using its native `${CLAUDE_PLUGIN_ROOT}` placeholder. The launcher resolves the `PreToolUse` adapter relative to its own installed path, independent of the session working directory. Restart Claude Code or run `/reload-plugins` after hook changes.

Claude Code exposes no supported plugin image field and must remain free of undocumented visual metadata.

Claude Code has no verified noninteractive, account-aware model-list command equivalent to Cursor's in the currently tested CLI. Buddy can use the interactive `/model` picker, readable organization `availableModels` policy, and user confirmation to discover candidates. Conclusive validation requires an enumerated live dispatch schema or an approved bounded probe.

Buddy stores Claude Code tiers as separate `model` and optional `effort` fields. Supported effort is model-dependent, and Claude may reduce an unsupported effort, so that fallback is not exact validation. Extended thinking is inherited from the main conversation; Buddy does not claim a separate per-subagent thinking control.

Source validation uses `claude plugin validate --strict .`. Direct loading uses `claude --plugin-dir .`; marketplace registration is a later, state-mutating integration test.

### Cursor

`.cursor-plugin/plugin.json` points to root skills and agents and selects `hooks/cursor/hooks.json`. Cursor hooks are not interchangeable with Claude hooks, and Cursor uses `mcp.json` rather than `.mcp.json`. Buddy's command hook uses `beforeShellExecution` without a matcher so every shell command reaches the policy engine. It sets `failClosed: false` so a launcher, runtime, timeout, or invalid-output failure does not disable Cursor's shell; intentional structured denials still block destructive commands. The registry invokes `hooks/cursor/run-before-shell-execution.zsh`, which resolves the shared policy engine from `${0:A:h}` and falls back to the documented local install copy.

Cursor uses the shared asset through the per-plugin manifest; its marketplace entry intentionally omits `logo` because the current published marketplace schema rejects it.

After checking the installed subcommand help, `cursor-agent models` lists models available to the current account and exposes exact selectable identifiers, including supported thinking, effort, speed, context, or bracket parameters. Buddy copies the exact value surfaced or accepted by Cursor and does not reconstruct variants. This catalog does not prove subagent dispatchability: plan or team restrictions and the live dispatch interface can still prevent Cursor from honoring a requested model.

Local development copies the checkout into `~/.cursor/plugins/local/buddy`, followed by a Cursor window reload. Cursor rejects symlinks whose target is outside `~/.cursor/plugins/local`, so a symlink to a separate development checkout will not load. The repository-root `.cursor-plugin/marketplace.json` uses `source: "."`, which resolves to this root when Cursor obtains the Git-backed marketplace repository. Moving Buddy under `plugins/buddy/` would violate this repository's root-plugin contract.

Cursor Cloud Agents support command-based `beforeShellExecution` hooks but run in isolated Ubuntu VMs. Current Cursor documentation lists repository `.cursor/hooks.json`, Enterprise team hooks, and enterprise-managed hooks as cloud sources; it does not list plugin-bundled hook registries. Buddy's workflow components may be usable through Cursor web while destructive-command enforcement remains unverified in Cloud Agents. Do not claim cloud enforcement until a Marketplace installation proves it or Cursor documents plugin hooks as a cloud source.

## Refresh local development installs

Run the repository validator before reloading either harness.

### Codex

The current Codex CLI has no `plugin update` command. Its `plugin marketplace upgrade` command refreshes Git marketplace snapshots, not a local marketplace. To force Codex to reload Buddy from this registered local checkout:

```bash
codex plugin remove buddy@buddy
codex plugin add buddy@buddy
```

Then refresh or restart Codex and start a new task. An already running task keeps the skill snapshot it loaded at startup. The ChatGPT Plugin Directory installation or connection is a separate surface and may also need to be refreshed after a local reinstall.

### Cursor

For Cursor Agent, load the checkout directly on every new invocation:

```bash
cursor-agent --plugin-dir .
```

For Cursor desktop, copy the updated checkout into `~/.cursor/plugins/local/buddy`, reload the Cursor window, and confirm Buddy is enabled under **Customize → Plugins**:

```bash
rsync -a --delete --exclude .git /path/to/buddy/ ~/.cursor/plugins/local/buddy/
```

The destructive-command hook registers through the plugin manifest. After reload, check **Customize → Hooks** and the **Hooks output channel**; user-level `~/.cursor/hooks.json` entries are separate. If skills load but the hook does not, toggle Buddy off and on in **Customize → Plugins**.

## Marketplace boundaries

Codex, Claude Code, and Cursor use different marketplace schemas; the three marketplace files are adapters, not interchangeable catalogs. Keep their plugin id and base version aligned, then validate all harnesses after every change with:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Registration, installation, publication, and marketplace submission change external or user state and are intentionally outside source validation.

The unified validator applies checked-in schema rules to every harness and invokes Claude's first-party strict validator when available. Agent Skills also has an external reference validator, Codex has the plugin-creator validator, and Cursor publishes JSON schemas rather than a plugin-validation CLI. Those external checks are release-time corroboration; the checked-in validator remains the offline gate after each edit.

## Sources

1. [Agent Skills specification](https://agentskills.io/specification)
2. [Codex skills](https://developers.openai.com/codex/skills)
3. [Codex hooks](https://developers.openai.com/codex/hooks)
4. [Codex cloud environments](https://developers.openai.com/codex/environments/cloud-environment)
5. [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference)
6. [Claude Code on the web](https://code.claude.com/docs/en/claude-code-on-the-web)
7. [Cursor plugin reference](https://cursor.com/docs/reference/plugins)
8. [Cursor rules](https://cursor.com/docs/rules)
9. [Cursor Cloud Agent best practices](https://cursor.com/docs/cloud-agent/best-practices)
10. [Cursor hooks](https://cursor.com/docs/hooks)
