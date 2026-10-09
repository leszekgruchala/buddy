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
| Account-aware model discovery | `codex debug models` catalog | Interactive `/model` and organization policy | `cursor-agent models` catalog; Task dispatch via live Task tool enum |
| Buddy model selection | Live supported dispatch choices | Live supported dispatch choices | Live supported dispatch choices |
| Commands | Use skills | Supported; skills preferred | Supported |
| Rules/project instructions | Project `AGENTS.md`, not plugin-shipped | Project `CLAUDE.md`, not plugin-shipped | Plugin `rules/` is the standing request for one native Goal on a Buddy implement run. A rejected call uses the parent checklist. Codex and Claude have no agent-callable Goal tool and use that checklist |
| Destructive-command hook | Fixed default shared `PreToolUse` | Manifest-selected shared `PreToolUse` | Manifest-selected shared `PreToolUse` |
| Hook runtime | `/bin/zsh`, `jq`, `git` | `/bin/zsh`, `jq`, `git` | `/bin/zsh`, `jq`, `git` |
| MCP root file | `.mcp.json` via manifest | `.mcp.json` | `mcp.json` |
| Plugin visual mark | `composerIcon` and `logo` | No supported image field | `logo` |
| Local plugin loading | Marketplace install | `claude --plugin-dir .` | Copy under `~/.cursor/plugins/local/` |

## Shared contracts

Each skill follows the Agent Skills standard: exact `SKILL.md`, standard `name` and `description` frontmatter, a non-empty instruction body, and on-demand references. Harness-only frontmatter stays out of shared skills.

Each specialist skill owns one phase. It cannot activate another Buddy skill unless the user explicitly requests the transition or the `develop` orchestrator explicitly dispatches it. Workers return to their caller instead of advancing themselves. For implementation, the host materializes an effective brief from the current shared contract and one compact phase delta. Every tier receives its referenced requirements and the criteria it establishes at completion plus the verification entries that name those criteria. Phase references cover all work authorized by the delta without repeating inherited contract content. Balanced and frontier workers may form disposable runtime plans, but persisted boundaries and mutation ownership remain authoritative. `develop` may enable only stages required by the user's authorized task.

This gate is a workflow contract, not a universal security boundary. Claude can enforce stronger tool restrictions with Claude-only agent fields, but those fields are excluded because Cursor's documented portable agent schema guarantees only `name` and `description`. Codex and Cursor enforcement therefore depends on the live tool surface and sandbox.

### Destructive-command guard

Buddy keeps one zsh policy engine in `hooks/block-destructive-commands/block-destructive-shell.zsh`. Codex, Claude Code, and Cursor invoke `hooks/run-pretooluse.zsh`, which self-locates `block-destructive-shell-pretooluse.zsh`; that adapter translates their shared `PreToolUse` input and denial output to the policy engine.

Claude Code and Cursor explicitly point to `./hooks/hooks.json`. Codex intentionally omits the manifest field because the installed Codex plugin validator rejects it, and loads the same fixed default `hooks/hooks.json` path. The repository validator enforces both explicit references and loads the exact default path, so moving the registry without updating the contract fails validation. Cursor's third-party hook compatibility maps the Claude-style `PreToolUse` event and `Bash` matcher to its native hook and shell tool. Buddy returns intentional structured decisions and exits `0`, including when it must deny because its input or runtime is invalid.

The initial supported runtime is macOS 10.15 or newer with `/bin/zsh`, `jq`, and `git`. Missing dependencies, malformed input, parser failures, and invalid adapter responses deny shell execution with actionable guidance. The policy permits removal only for direct commands with explicit literal targets inside the active Git worktree and denies the worktree root, Git metadata, external or dynamic paths, globs, ambiguous compound or nested removal, and symlink traversal.

### Semantic model selection

Skills recommend `balanced`, except for `spec` and `review-code`, which recommend `frontier`. Apply the shared [model selection reference](../skills/develop/model-selection.md): explicit agent, tier, model, and effort requests override skill and phase recommendations. Phase instructions, boundaries, and mutation ownership remain unchanged.

Buddy ignores existing profiles and has no packaged model mappings or separate review mapping. Native account and organization settings still constrain execution. Catalog visibility does not prove dispatch acceptance. Use supported choices; report and stop an affected stage when an explicit choice or required execution cannot run.

Review keeps its fresh independent context, including re-reviews. Host execution, bounded worker dispatch, native overrides, and effective-model provenance follow the shared reference rather than duplicated per-skill rules. Unavailable review dispatch blocks completion.

## Harness details

### Codex

`.codex-plugin/plugin.json` exposes root skills. Codex has no supported plugin `agents` field, so `develop` dispatches generic Codex subagents and explicitly names the required Buddy skill. Root `agents/` files are packaged but not registered as first-class Codex agents. Root `AGENTS.md` maintains this repository and is not inherited by projects installing Buddy.

Codex loads Buddy's shared root `hooks/hooks.json` from its fixed plugin default. Buddy's validator requires the Codex manifest to omit `hooks` for compatibility with the installed Codex plugin validator and independently loads that exact registry path, so a move cannot pass unnoticed. The registry invokes the shared launcher through `${CLAUDE_PLUGIN_ROOT}`, which Codex exports as a compatibility alias alongside its native `${PLUGIN_ROOT}`; the launcher then resolves the adapter relative to its own installed path. Plugin installation does not trust bundled hooks automatically: after installing or updating Buddy, restart Codex and use `/hooks` to review and trust the current hook definition.

Codex uses the shared `assets/buddy.svg` for both visual fields.

After checking the installed subcommand help, `codex debug models` provides the current Codex model catalog, including model slugs and supported reasoning levels. The live host dispatch schema determines the exact model and effort fields; Buddy does not invent a combined slug or copy configuration fields into a different tool. Catalog membership is only candidate discovery: the host-provided subagent dispatch schema may expose a narrower model or reasoning enum and remains authoritative. See [model selection](../skills/develop/model-selection.md) for native overrides and effective-model verification.

### Claude Code

`.claude-plugin/plugin.json` points to root skills; Claude's validated manifest schema rejects an explicit `agents` path, so agents use Claude's default root `agents/` discovery. Claude exposes both as namespaced plugin components. Shared agent files intentionally use only the Cursor-compatible metadata subset, so they do not use Claude-only `skills`, `tools`, `disallowedTools`, `model`, or `isolation` fields. This trades Claude-specific enforcement for one shared agent definition.

Claude Code's manifest explicitly points to the same root `hooks/hooks.json` and invokes the shared launcher using its native `${CLAUDE_PLUGIN_ROOT}` placeholder. The launcher resolves the `PreToolUse` adapter relative to its own installed path, independent of the session working directory. Restart Claude Code or run `/reload-plugins` after hook changes.

Claude Code exposes no supported plugin image field and must remain free of undocumented visual metadata.

Claude Code has no verified noninteractive, account-aware model-list command equivalent to Cursor's in the currently tested CLI. Native model controls and readable organization policy provide candidate information; the live Agent interface remains authoritative for dispatch. Use documented aliases only when accepted by that interface. Native forced-model settings can override requested selection, and supported effort controls depend on the execution surface. Do not invent a per-call effort or thinking field. See [model selection](../skills/develop/model-selection.md) for native constraints and effective-model verification.

Source validation uses `claude plugin validate --strict .`. Direct loading uses `claude --plugin-dir .`; marketplace registration is a later, state-mutating integration test.

### Cursor

`.cursor-plugin/plugin.json` points explicitly to root skills, agents, `rules/`, and the shared `hooks/hooks.json`. `rules/buddy-goal.mdc` is always applied. It is the standing request for one native Goal on a Buddy `implement` run, including a run `develop` dispatches, unless the user opts out. The main agent tries once, with the run outcome as the objective. Cursor can still reject CreateGoal: the tool is specified for an explicit user request, and a plugin rule does not override that policy. Task has no Goal field, so the parent passes only the objective text. UpdateGoal changes the calling agent's Goal and takes no goal id, so a worker cannot update the parent's Goal. When the parent cannot create one, the launch prompt tells the worker to try once for its own agent. The worker continues if that tool is missing or the call is refused. A missing Goal-gate phrase does not stop the worker. Codex and Claude keep one parent checklist. Their `/goal` commands are user-typed completion loops, not this Goal. Always-apply rules are included in every chat session. Subagents start from a clean context plus the parent's prompt, and official docs do not say rules are parent-only. Buddy uses the Claude-compatible `PreToolUse` plugin shape because Cursor maps that event to native `preToolUse`, maps the `Bash` matcher to `Shell`, and accepts the nested `hookSpecificOutput` response. This explicit path matches Cursor's plugin manifest contract while avoiding the current plugin-registration gap for the native camelCase flat format. Cursor uses `mcp.json` rather than `.mcp.json`.

Cursor uses the shared asset through the per-plugin manifest; its marketplace entry intentionally omits `logo` because the current published marketplace schema rejects it.

After checking the installed subcommand help, `cursor-agent models` lists models available to the current account and exposes exact selectable identifiers, including supported thinking, effort, speed, context, or bracket parameters. Buddy copies the exact value surfaced or accepted by Cursor and does not reconstruct variants. This catalog does not prove Task subagent dispatchability: Buddy workers use the **Task** tool, and its live `model` enum is session-specific and often narrower than the catalog. See [model selection](../skills/develop/model-selection.md) for Task acceptance and effective-model verification. Plan or team restrictions and the live dispatch interface can still prevent Cursor from honoring a requested model.

Local development copies the checkout into `~/.cursor/plugins/local/buddy`, followed by a Cursor window reload. Cursor rejects symlinks whose target is outside `~/.cursor/plugins/local`, so a symlink to a separate development checkout will not load. The repository-root `.cursor-plugin/marketplace.json` uses `source: "."`, which resolves to this root when Cursor obtains the Git-backed marketplace repository. Moving Buddy under `plugins/buddy/` would violate this repository's root-plugin contract.

Cursor Cloud Agents support command hooks but run in isolated Ubuntu VMs. Current Cursor documentation lists repository `.cursor/hooks.json`, Enterprise team hooks, and enterprise-managed hooks as cloud sources; it does not list plugin-bundled hook registries. Buddy's workflow components may be usable through Cursor web while destructive-command enforcement remains unverified in Cloud Agents. Do not claim cloud enforcement until a Marketplace installation proves it or Cursor documents plugin hooks as a cloud source.

## Local development validation

Run the repository validator, then follow the exact checkout-loading, smoke-test, and restoration steps in [Local Harness Validation](local-harness-validation.md). Always start a fresh task or session after reloading a plugin: an existing one keeps the component snapshot it loaded at startup.

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
11. [Cursor third-party hook compatibility](https://cursor.com/docs/reference/third-party-hooks)
12. [Cursor staff confirmation of the plugin hook registration gap](https://forum.cursor.com/t/sessionend-hook-fires-only-on-window-close-after-shell-exec-teardown-plugin-hook-commands-can-never-execute/165492)
