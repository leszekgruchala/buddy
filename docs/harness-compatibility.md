# Harness Compatibility

Buddy keeps reusable behavior in root `skills/` and its one named agent, `code-reviewer`, in root `agents/`. Stage workers are ordinary subagents that load the stage skill. Harness manifests point to those directories; they do not duplicate workflow instructions.

## Capability matrix

| Capability | Codex | Claude Code | Cursor |
|---|---|---|---|
| Agent Skills `SKILL.md` | Yes | Yes | Yes |
| Root `skills/` discovery | Manifest path | Manifest path/default | Manifest path/default |
| Root named agents (`code-reviewer`) | No plugin component | Yes | Yes |
| Root `agents/` schema | Not consumed | Rich Claude schema | Portable subset: `name`, `description` |
| Stage worker | Generic `worker` subagent that loads the stage skill | General-purpose subagent that loads the stage skill | Generic `Task` subagent that loads the stage skill |
| Per-agent tool denial | Dispatch/sandbox dependent | Supported, but nonportable | Not in the common documented schema |
| Per-agent model selection | Dispatch API dependent | Supported | Harness dependent |
| Account-aware model discovery | `codex debug models` catalog | Interactive `/model` and organization policy | `cursor-agent models` catalog; Task dispatch via live Task tool enum |
| Buddy model selection | Live supported dispatch choices | Live supported dispatch choices | Live supported dispatch choices |
| Commands | Use skills | Supported; skills preferred | Supported |
| Rules/project instructions | Project `AGENTS.md`, not plugin-shipped | Project `CLAUDE.md`, not plugin-shipped | Plugin `rules/` is the standing request for one native Goal on a Buddy implement run. A rejected call uses the parent checklist. Codex and Claude have no agent-callable Goal tool and use that checklist |
| Destructive-command hook | Manifest-selected `PreToolUse` that denies | Default `PreToolUse` that asks | Manifest-selected `beforeShellExecution` that asks |
| Run continuation hook | `Stop` with `decision: block` | `Stop` with `decision: block` | `stop` with `followup_message`, `loop_limit: null` |
| Hook runtime | `/bin/zsh`, `jq` | `/bin/zsh`, `jq` | `/bin/zsh`, `jq` |
| MCP root file | `.mcp.json` via manifest | `.mcp.json` | `mcp.json` |
| Plugin visual mark | `composerIcon` and `logo` | No supported image field | `logo` |
| Local plugin loading | Marketplace install | `claude --plugin-dir .` | Copy under `~/.cursor/plugins/local/` |

## Shared contracts

Each skill follows the Agent Skills standard: exact `SKILL.md`, standard `name` and `description` frontmatter, a non-empty instruction body, and on-demand references. Harness-only frontmatter stays out of shared skills.

Each specialist skill owns the current request or assigned phase. Completed requests do not lock later requests into that skill; classify and route each new request by its own scope. It cannot activate another Buddy skill unless the user explicitly requests the transition or the `develop` orchestrator explicitly dispatches it. Workers return to their caller instead of advancing themselves. For implementation, the host materializes an effective brief from the current shared contract and one compact phase delta. Every tier receives its referenced requirements and the criteria it establishes at completion plus the verification entries that name those criteria. Phase references cover all work authorized by the delta without repeating inherited contract content. Balanced and frontier workers may form disposable runtime plans, but persisted boundaries and mutation ownership remain authoritative. `develop` may enable only stages required by the user's authorized task.

This gate is a workflow contract, not a universal security boundary. Claude can enforce stronger tool restrictions with Claude-only agent fields, but those fields are excluded because Cursor's documented portable agent schema guarantees only `name` and `description`. Codex and Cursor enforcement therefore depends on the live tool surface and sandbox.

### Destructive-command guard

Buddy keeps one zsh policy engine in `hooks/block-destructive-commands/block-destructive-shell.zsh`. Each harness has its own hook file, which calls `hooks/run-pretooluse.zsh` with the harness name. That entrypoint self-locates `block-destructive-shell-pretooluse.zsh`, which translates the harness input to the policy engine and returns the decision in the harness output format.

| Harness | Hook file | Event | Decision for a guarded command |
|---|---|---|---|
| Claude Code | `hooks/hooks.json` | `PreToolUse` | `ask` |
| Codex | `hooks/codex-hooks.json` | `PreToolUse` | `deny` |
| Cursor | `hooks/cursor-hooks.json` | `beforeShellExecution` | `ask` |

The decision follows what each harness enforces:

- Claude Code always loads the default `hooks/hooks.json` and merges the manifest `hooks` entries into it. Its `ask` shows the permission prompt. In a `-p` run where nobody can answer, Claude Code denies the call and gives the reason to the agent.
- Codex uses the manifest `hooks` entry instead of the default file. It parses `ask` but does not support it: it marks the hook run as failed and runs the command. Therefore Codex denies. Codex skips plugin hooks until the user reviews and trusts them.
- Cursor uses the manifest `hooks` entry instead of the default file. It does not enforce `ask` from `preToolUse`, but `beforeShellExecution` honors it. Auto-run modes such as `--force` approve an `ask`, which is the user's choice.

If a harness loads a hook file that is not its own, the adapter detects the Codex `turn_id` or the Cursor `cursor_version` input field and denies. Buddy returns intentional structured decisions and exits `0`, including when it must deny because its input or runtime is invalid. The repository validator checks each hook file, each manifest reference, and the decision of each harness.

The supported runtime is macOS 10.15 or newer with `/bin/zsh` and `jq`. A missing `jq`, malformed hook input, and invalid adapter responses deny shell execution with actionable guidance. The policy is an accident guard, not a security boundary. It blocks a fixed list of irreversible commands, also inside wrappers, nested `sh -c` commands, `eval`, and heredocs that a shell or SQL client reads. It allows every command that it cannot parse. The change rules and test requirements are in `hooks/block-destructive-commands/AGENTS.md`.

### Run continuation hook

`hooks/run-stop.zsh <harness>` launches `hooks/continue-run/continue-run-stop.zsh`. When the agent stops, the hook resolves the workspace from Claude Code or Codex `cwd`, or from Cursor `workspace_roots` (then `CURSOR_PROJECT_DIR`, then `PWD`), and walks up to the nearest `.ai/worklog`. The walk stops at the git work-tree root, the first folder with a `.git` file or folder, without running git. Because `.ai` is gitignored, each worktree has its own worklog, and a worktree outside the repository never reaches a parent folder such as `~/.ai`. Without any `.git`, the walk goes up to `/`. Every `run-state.json` in that worklog that is younger than 24 hours is a candidate. The hook continues only when the session's run is `running`, younger than 24 hours, its `seq` changed since the hook's previous continuation, and the run has fewer than 30 continuations between user interactions. Bookkeeping is in `.stop-hook.json` beside the run state.

The hook continues only a session that worked on the run, so another session or worktree in the same workspace does not take over the run. All three harnesses send `transcript_path`; Cursor sends `null` when transcripts are off, and the hook then reads `CURSOR_TRANSCRIPT_PATH`. When the hook has a transcript path, the session's run is the newest candidate whose `.ai/worklog/<run>/run-state.json` the transcript contains. Only the host reads and writes that file; a run with a longer name or a session that only read the spec does not match. So several sessions in one checkout each continue their own run, and a session whose newer run waits for the user does not continue its older, abandoned `running` run. A missing or unreadable transcript, or one that mentions no candidate, allows the stop. A session that resumes the run after the original session ended reads and updates `run-state.json`, so its transcript mentions it. The search checks all candidates in one pass that reads the transcript from the start in 1 MiB chunks, up to 64 MiB, because the run can appear only early in a long transcript. Claude Code writes its transcript asynchronously, so the last messages can be missing; the run folder normally appears in earlier tool calls. When the input has no transcript path, the session's run is the newest candidate, and the first session that the hook continues owns it: the hook stores its Claude Code or Codex `session_id`, or its Cursor `conversation_id`, and allows the stop for every other id. Input without an id skips this check.

A run state marked `complete` while `review` is still `required` is handled as `running`, with a next step that asks for the required review; the `seq` check still applies. When the session's run state is `awaiting_user`, `blocked`, or `complete` without a pending review, the hook deletes `.stop-hook.json` and allows the stop. This resets the count and any session binding, so the session that resumes the run after the user answers can continue it. Every failure, including missing `jq` and malformed input, allows the stop. The hook never denies a tool call. `hooks/continue-run/validate-continue-run.zsh` tests each harness input shape.

| Harness | Event | Continue | Allow | Harness limits |
|---|---|---|---|---|
| Claude Code | `Stop` | `{"decision":"block","reason":...}` | Empty output | Ends the turn after 8 consecutive blocks without a tool call (`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`). A `seq` change needs a tool call, so this does not normally apply. Stop does not run on a user interrupt. When `background_tasks` has a `subagent`, `workflow`, `teammate`, `cloud session`, or `MCP task` entry, for example while a reviewer subagent runs, the hook allows the stop: Buddy expects this work to finish and wake the session. The Claude Code docs list these type names but do not state which types wake the session. `shell` and `monitor` tasks can run without end, so they do not stop continuation, and neither do `session_crons`. |
| Codex | `Stop` | `{"decision":"block","reason":...}`; `reason` becomes the next prompt | Empty output; plain text is invalid | Changing a hook file changes its hash, so users trust Buddy's hooks again in `/hooks` after an update. The Codex `Stop` input has no field for background work. |
| Cursor | `stop` | `{"followup_message":...}` | `{}` | Continues only when `status` is `completed`, never after an abort or error. `loop_limit` defaults to 5 per conversation; Buddy sets `null` and keeps its own cap between user interactions, as Cursor's first-party `ralph-loop` plugin does. Plugin `stop` hooks run from the workspace root. `cursor-agent` CLI support is unverified. |

### Semantic model selection

Skills recommend `balanced`, except for `spec`, which recommends `frontier`. Review is size-dependent: no automatic review for trivial work, `balanced` for small work, and `frontier` only for substantial or security-sensitive changes. Apply the shared [model selection reference](../skills/develop/model-selection.md): explicit agent, tier, model, and effort requests override skill and phase recommendations. Phase instructions, boundaries, and mutation ownership remain unchanged.

Buddy ignores existing profiles and has no packaged model mappings or separate review mapping. Native account and organization settings still constrain execution. Catalog visibility does not prove dispatch acceptance. Use supported choices; report and stop an affected stage when an explicit choice or required execution cannot run.

Required review keeps its fresh independent context, including required re-reviews. Apply the [change-size policy](../skills/develop/change-size.md) before dispatch; it controls host execution, step overrides, and optional review consent. Host execution, bounded worker dispatch, native overrides, and effective-model provenance follow the shared reference rather than duplicated per-skill rules. Unavailable required review dispatch blocks completion.

## Harness details

### Codex

`.codex-plugin/plugin.json` exposes root skills. Codex has no supported plugin `agents` field, so `develop` dispatches generic Codex subagents, including the reviewer, and explicitly names the required Buddy skill. Codex subagents inherit the parent's skills, including plugin skills. Root `agents/` files are packaged but not registered as first-class Codex agents. Root `AGENTS.md` maintains this repository and is not inherited by projects installing Buddy.

Codex loads Buddy's `hooks/codex-hooks.json` through the explicit `hooks` path in `.codex-plugin/plugin.json`. This replaces default discovery of `hooks/hooks.json`, so Codex receives its own deny response instead of Claude Code's approval request. Buddy's validator checks the manifest path and the registry. The registry invokes the shared launcher through `${CLAUDE_PLUGIN_ROOT}`, which Codex exports as a compatibility alias alongside `${PLUGIN_ROOT}`; the launcher then resolves the adapter relative to its own installed path. Plugin installation does not trust bundled hooks automatically: after installing or updating Buddy, restart Codex and use `/hooks` to review and trust the current hook definition.

Codex uses the shared `assets/buddy.svg` for both visual fields.

After checking the installed subcommand help, `codex debug models` provides the current Codex model catalog, including model slugs and supported reasoning levels. The live host dispatch schema determines the exact model and effort fields; Buddy does not invent a combined slug or copy configuration fields into a different tool. Catalog membership is only candidate discovery: the host-provided subagent dispatch schema may expose a narrower model or reasoning enum and remains authoritative. See [model selection](../skills/develop/model-selection.md) for native overrides and effective-model verification.

### Claude Code

`.claude-plugin/plugin.json` points to root skills; Claude's manifest `agents` field accepts only a list of `.md` files, not a directory, and a list replaces default discovery, so Buddy omits it and agents use Claude's default root `agents/` discovery. Claude exposes both as namespaced plugin components. Shared agent files intentionally use only the Cursor-compatible metadata subset, so they do not use Claude-only `skills`, `tools`, `disallowedTools`, `model`, or `isolation` fields. This trades Claude-specific enforcement for one shared agent definition.

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
