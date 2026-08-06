# Portable destructive-command hooks for Buddy

## QUESTION

How can the destructive-command hook from `/Users/lgr/projects/pirum/ai-tools/hooks/block-destructive-commands` be adapted for a broader Buddy audience, packaged across Codex, Claude Code, and Cursor, and documented using the strongest parts of Context Mode's installation approach?

This is research only. No hook, manifest, validator, or README implementation has been changed.

Research snapshot: 2026-08-04. Context Mode upstream `main` was inspected at commit `e7ef67e5353fe177e0e723fccdc47e3531b6969c`; its installed Buddy-adjacent package was version `1.0.169`.

## FINDINGS

### 1. Existing hook architecture and behavior

Verified from the source files:

- `block-destructive-shell.zsh` is a 662-line policy engine implementing Cursor's `beforeShellExecution` JSON contract.
- `block-destructive-shell-pretooluse.zsh` is a 92-line adapter shared by Codex and Claude Code. It reads `.tool_input.command` (or `.tool_input.cmd`) and `.cwd` (or `.tool_input.cwd`), invokes the Cursor-contract engine, and converts a deny/ask result into the common `PreToolUse` `hookSpecificOutput.permissionDecision = "deny"` shape.
- `validate-block-destructive-shell.zsh` is a 179-line regression runner covering Cursor and the shared Codex/Claude adapter. The source directory's `AGENTS.md` describes 42 policy cases and requires safe-path latency checks.
- The policy allows direct removal only for explicit literal targets inside the active Git worktree. It denies worktree-root deletion, `.git` paths, paths outside the worktree, dynamic or globbed removal, symlink traversal, ambiguous compound/nested deletion, and destructive infrastructure, container, cloud, database, and SQL commands.
- Production paths intentionally fail closed, emit structured decisions, and exit `0`. This is important because non-zero hook failures are fail-open on some harnesses.
- The policy engine uses only zsh plus `jq` and `git` as production dependencies. The validator additionally uses standard fixture utilities.

### 2. This is a substantive zsh dependency, not a shebang dependency

Verified zsh-specific constructs in the engine include:

- `emulate -L zsh`, `setopt extendedglob pipefail rematchpcre`, and zsh `print`;
- `${(z)command}` for shell-like lexical splitting;
- zsh parameter modifiers such as `${token:t:l}` and `${argument:l}`;
- one-based zsh arrays and zsh array expansion semantics;
- PCRE matching through `rematchpcre`;
- dynamic file descriptors, NUL-delimited reads, and process substitution;
- zsh-specific script path resolution through `${0:A:h}`.

The `PreToolUse` adapter uses the same script-path, dynamic-FD, NUL-read, `typeset`, `print`, and option-management features.

Inference: changing `#!/bin/zsh` to `#!/bin/bash` would not produce a valid port. The highest-risk replacement is `${(z)command}` because the safety policy depends on reliable token boundaries across quoting, wrappers, nested shells, and compound commands. Bash 3.2 has no equivalent shell lexer primitive.

### 3. The actual portable-runtime baseline

Apple documents that zsh is the default login and interactive shell for new accounts starting with macOS 10.15, while older macOS releases defaulted to bash: [Apple: Use zsh as the default shell on Mac](https://support.apple.com/en-us/102360).

The current research host, macOS 26.6, has:

- `/bin/bash` 3.2.57;
- `/bin/zsh` 5.9;
- `/bin/sh` backed by Bash 3.2.57;
- Homebrew-provided `jq` and `git` selected first on `PATH`.

This local observation proves that a Bash port intended for stock macOS must support Bash 3.2; it does not prove that `jq` or a usable non-interactive `git` is present on every Mac. A broad Linux audience can usually be expected to have `/bin/sh`, often Bash, but not zsh or `jq` universally.

The narrowed initial target discussed on 2026-08-05 is macOS 10.15 or newer, using Apple's system `/bin/zsh`, with Windows explicitly out of the initial scope. Under that target, keeping the existing zsh implementation is more portable than assuming Homebrew Bash 5.3:

- `/bin/zsh` is an operating-system component on every supported Mac in scope.
- Homebrew is optional, and its Bash path differs between common installations (`/opt/homebrew/bin/bash` on Apple Silicon and `/usr/local/bin/bash` on many Intel installations).
- Hook execution is non-interactive. The user's preferred login shell does not matter when the registry explicitly invokes `/bin/zsh`.
- Requiring Homebrew Bash would introduce a new dependency while still requiring the security-sensitive tokenizer rewrite described above.

Inference: for a macOS-first release, use `/bin/zsh` directly and do not require or detect Homebrew Bash. Revisit Bash only when Linux without zsh becomes an explicit support target.

### 3.1 Why the current hook uses `jq` and `git`

`jq` handles the JSON wire protocols, not the destructive-command policy itself:

- the Cursor engine reads top-level `command` and `cwd` fields;
- the shared Codex/Claude adapter reads nested `.tool_input.command` or `.tool_input.cmd` plus the applicable working directory;
- a command supplied as an array is normalized into one string;
- denial messages are JSON-escaped safely when constructing Cursor and `PreToolUse` responses;
- the adapter validates and extracts the Cursor engine's returned permission and message.

Without `jq`, the hook needs another trustworthy JSON decoder and encoder. Shell substring or regular-expression extraction is unsafe because commands can contain quotes, backslashes, newlines, Unicode, and JSON escape sequences.

Modern macOS `plutil` can technically extract and convert JSON input, including nested arrays, but it remains a property-list utility rather than a general JSON processor. Its JSON behavior has not been established across the macOS 10.15 support floor, its validation modes are inconsistent with its conversion modes, and constructing nested dynamic hook responses would be awkward. Do not treat `plutil` as the proposed `jq` replacement.

`git` supplies the repository boundary used by the deletion exception:

- `git -C "$cwd" rev-parse --show-toplevel` resolves the actual active worktree root;
- the hook then allows only explicit literal removal targets below that root;
- it denies the worktree root, `.git`, paths outside the worktree, unresolved dynamic paths, and symlink traversal.

Using `cwd` alone would weaken the contract: `cwd` can be a subdirectory, an arbitrary non-repository directory, or a path whose relationship to the worktree is not known. Reimplementing Git discovery by walking for `.git` would mishandle linked worktrees, `.git` files, submodules, and other valid layouts.

The current hook resolves both dependencies before analyzing the command, so missing `jq` or `git` blocks every shell command. A later implementation should evaluate resolving `git` lazily: harmless commands and non-filesystem policy checks could proceed without it, while any removal requiring worktree proof would deny with an actionable “git unavailable” reason. `jq` cannot be made lazy in the same way because the hook needs JSON decoding before it knows which command is being requested.

### 4. Current Buddy packaging

Buddy currently has no hooks:

- `.codex-plugin/plugin.json` declares `skills` only.
- `.claude-plugin/plugin.json` declares `skills` only.
- `.cursor-plugin/plugin.json` declares `skills` and `agents`.
- The root has no `hooks/` directory.

The three marketplace files are already harness-specific and aligned around the same root plugin:

- Codex: `.agents/plugins/marketplace.json` points to the Git repository and `main`.
- Claude Code: `.claude-plugin/marketplace.json` points to `.`.
- Cursor: `.cursor-plugin/marketplace.json` points to `.`.

The README already uses the installed, verified commands:

- Codex: `codex plugin marketplace add leszekgruchala/buddy --ref main`, then `codex plugin add buddy@buddy`.
- Claude Code: `claude plugin marketplace add leszekgruchala/buddy@main`, then `claude plugin install buddy@buddy`.
- Cursor: Marketplace/Customize when published, otherwise a copy under `~/.cursor/plugins/local/buddy`, followed by **Developer: Reload Window**.

### 5. How Context Mode packages hooks across the three harnesses

Context Mode uses one plugin root but separate hook registries where platform schemas or path variables differ:

| Harness | Registration | Hook implementation reference | Activation model |
| --- | --- | --- | --- |
| Claude Code | Conventional root `hooks/hooks.json`; its `.claude-plugin/plugin.json` does not need a `hooks` field | Commands use `${CLAUDE_PLUGIN_ROOT}` | Installed plugin loads hooks; restart or `/reload-plugins` picks up changes |
| Codex | `.codex-plugin/plugin.json` explicitly points `hooks` to `./.codex-plugin/hooks.json` | Commands use `${PLUGIN_ROOT}` | Hooks must be enabled and each current hook definition must be reviewed/trusted |
| Cursor | `.cursor-plugin/plugin.json` explicitly points `hooks` to `./hooks/cursor/hooks.json` | Context Mode invokes its installed/global CLI (`npx -y context-mode ...`) rather than relying on a plugin-root variable | Plugin install or local-folder load registers hooks; Cursor reloads config changes and exposes a Hooks UI/output channel |

This separation is mostly protocol plumbing. Context Mode does not duplicate its underlying product logic in each registry.

Its README installation sections follow a consistent reader contract:

1. State platform and install complexity in the disclosure heading.
2. State prerequisites.
3. Give one recommended plugin installation path.
4. Explain restart/reload behavior.
5. Give an explicit verification step.
6. Explain what routing/hooks are automatic and what still needs manual action.
7. Put manual or MCP-only alternatives in a nested option.
8. Call out duplicate-hook risks when migrating from a prior manual install.

Specific Context Mode behavior:

- Claude Code is presented as fully automatic: marketplace add, plugin install, restart or `/reload-plugins`, then a doctor command. A separate MCP-only path explicitly says it omits hooks.
- Cursor currently documents a local-plugin path while Marketplace review is pending, plus a manual MCP/hooks path. It warns that keeping both plugin and manually configured hooks causes duplicate firings.
- Codex documents bundled hooks plus a manual fallback. It correctly distinguishes MCP verification from hook verification and tells users to review/trust plugin hooks.

### 6. Context Mode's Codex instructions must not be copied verbatim

Current Context Mode `main` still tells users to set both:

```toml
[features]
plugin_hooks = true
hooks = true
```

On the installed Codex used for this research, `codex features list` reports `hooks` as stable and enabled, but `plugin_hooks` as removed and false. Current official Codex hook documentation uses `hooks` as the canonical feature and documents plugin-bundled hooks without a separate `plugin_hooks` switch.

Verified Codex behavior from current official docs:

- a plugin can use the default `hooks/hooks.json` or a manifest `hooks` path;
- plugin hook commands receive `${PLUGIN_ROOT}` and compatibility variables including `${CLAUDE_PLUGIN_ROOT}`;
- installing/enabling a plugin does not trust its hooks automatically;
- users review and trust the exact hook hash in `/hooks`; changed hooks require review again;
- `.tool_input.command` is the Bash command input for `PreToolUse`;
- a deny decision uses `hookSpecificOutput.hookEventName = "PreToolUse"` and `permissionDecision = "deny"`.

Proposal implication: Buddy should follow current official Codex docs and installed CLI behavior, not copy Context Mode's stale `plugin_hooks` flag.

### 7. Harness contracts relevant to this safety hook

#### Codex

- Use a `PreToolUse` matcher covering the actual shell aliases exposed by current Codex (`Bash` and applicable shell aliases).
- Invoke a bundled adapter through a quoted `${PLUGIN_ROOT}` path.
- Keep structured deny output and exit `0`.
- Document `/hooks` review/trust separately from plugin installation and restart.

Sources: [Codex hooks](https://learn.chatgpt.com/docs/hooks.md), [Codex plugin builder documentation](https://developers.openai.com/plugins/build/plugins#bundled-mcp-servers-and-lifecycle-hooks).

#### Claude Code

- Put the plugin hook registry at root `hooks/hooks.json`.
- Match `Bash` for `PreToolUse`.
- Invoke the shared adapter using a quoted `${CLAUDE_PLUGIN_ROOT}` path.
- Exit `0` with structured JSON to deny; exit `2` with stderr is also blocking, but the existing shared contract intentionally uses structured JSON and `0`.
- Restart or run `/reload-plugins` after hook-component changes.

Sources: [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference.md), [Claude Code hooks reference](https://code.claude.com/docs/en/hooks.md), [Claude Code plugin installation](https://code.claude.com/docs/en/discover-plugins.md).

#### Cursor

- `hooks/hooks.json` is the default plugin component location, but a manifest `hooks` path can replace it. A separate Cursor registry is therefore compatible with the Claude conventional root registry.
- `beforeShellExecution` directly receives `command` and `cwd` and accepts `permission: allow | deny | ask`; this already matches the existing policy engine.
- Cursor supports `failClosed` for crashes, timeouts, and invalid output. Buddy should explicitly keep it `false`: expected failures already return structured denials with exit `0`, while a harness or runtime failure must not disable every agent shell command.
- Matchers for `beforeShellExecution` run against the shell command string. Omitting a narrow matcher is safer for complete destructive-command coverage, with latency controlled inside the hook.
- Cursor exposes active hooks in **Customize → Hooks** and a Hooks output channel.

Sources: [Cursor plugins](https://cursor.com/docs/plugins.md), [Cursor plugin reference](https://cursor.com/docs/reference/plugins.md), [Cursor hooks](https://cursor.com/docs/hooks.md).

### 8. Packaging shape that fits Buddy

The following is a proposal, not an implementation decision:

```text
hooks/
├── hooks.json                                  # Claude Code PreToolUse registry
├── block-destructive-commands/
│   ├── block-destructive-shell.bash            # shared policy engine
│   ├── block-destructive-shell-pretooluse.bash # shared Codex/Claude adapter
│   └── validate-block-destructive-shell.bash   # regression suite
└── cursor/
    └── hooks.json                              # Cursor beforeShellExecution registry
.codex-plugin/
└── hooks.json                                  # Codex PreToolUse registry
```

Manifest changes, if this direction is selected later:

- `.codex-plugin/plugin.json`: add `"hooks": "./.codex-plugin/hooks.json"`.
- `.cursor-plugin/plugin.json`: add `"hooks": "./hooks/cursor/hooks.json"`.
- `.claude-plugin/plugin.json`: no hook field is required when using the conventional root `hooks/hooks.json`; validate this with Claude strict validation.

The policy engine should remain shared. Only protocol registries and the Cursor-versus-`PreToolUse` adapter boundary should differ.

### 9. Portability proposals

These are alternatives for a later specification decision.

#### Narrowed proposal: macOS 10.15+ with system zsh

- Keep the audited policy engine and shared `PreToolUse` adapter in zsh.
- Invoke them explicitly with `/bin/zsh`; do not depend on the user's login shell or Homebrew Bash.
- Treat Windows as unsupported initially.
- Decide separately whether `jq` remains an installation prerequisite or is replaced by a proven macOS-native JSON path.
- Retain `git` for worktree-aware removal, preferably resolving it only when that policy branch needs it.

Trade-off: this avoids an unnecessary security-sensitive parser rewrite and covers the intended modern macOS audience. Linux machines without zsh remain unsupported until Linux becomes an explicit target.

#### Proposal A: Bash 3.2 minimum, retain `jq` and `git`

- Rewrite production scripts for `/bin/bash` 3.2, avoiding Bash 4+ features such as associative arrays, `mapfile`, and dynamic-FD syntax not available in 3.2.
- Replace zsh lexical splitting and PCRE-dependent behavior with an explicit, tested tokenizer/parser suitable for the command forms in policy scope.
- Keep `jq` for safe JSON input/output and `git` for worktree boundary resolution.
- Document `bash`, `jq`, and `git` as prerequisites and fail closed with an actionable diagnostic when either dependency is absent.

Trade-off: closest match to the requested audience and existing design, but the tokenizer rewrite is security-sensitive and `jq` is still not a stock-shell-only solution.

#### Proposal B: Bash 3.2 with an embedded minimal JSON codec

- Same Bash policy/parser rewrite as Proposal A.
- Replace `jq` with a narrowly scoped JSON string/object decoder and encoder that supports exactly the two harness payload shapes.
- Keep `git` for repository safety boundaries.

Trade-off: removes the largest non-default dependency, but introduces another security-sensitive parser. It is only credible with exhaustive escaped-string, Unicode, malformed-input, and fuzz-style tests. It should not be treated as a small optimization.

#### Proposal C: POSIX `sh` implementation

- Target `/bin/sh`, use only POSIX shell features and ubiquitous utilities.
- Rebuild arrays, tokenization, matching, and JSON handling around line-oriented data or a portable helper.

Trade-off: widest nominal shell availability, but materially greater complexity and weaker ergonomics for the existing policy. `pipefail` is not POSIX. This option offers little value over Bash 3.2 unless non-Bash Unix systems are an explicit support target.

#### Proposal D: keep zsh on macOS and add a Bash fallback

- Preserve the audited zsh engine where `/bin/zsh` exists.
- Add a separately tested Bash engine for Linux/other hosts and dispatch between them.

Trade-off: faster initial reuse but creates two security-policy implementations that can drift. It conflicts with Buddy's preference for shared implementations and should only be considered if a behavior-equivalent Bash port proves infeasible.

#### Proposal E: use a non-shell runtime

- Reimplement JSON and parsing in Node or another portable runtime, as Context Mode does with Node.

Trade-off: simpler robust parsing, but it directly misses the stated bash-only audience. Context Mode can do this because its README makes Node 22.5/Bun an explicit prerequisite; Buddy currently has no such runtime prerequisite.

### 10. Documentation proposal modeled on Context Mode

If hooks are implemented later, revise each existing Buddy install disclosure with a short hook subsection:

- **Prerequisites:** macOS 10.15+, system `/bin/zsh`, and whether `jq`/`git` are required.
- **Install:** preserve the currently verified plugin commands.
- **Enable/register:** explain what plugin installation registers automatically and any harness-specific trust step.
- **Restart/reload:** Codex new task/restart, Claude `/reload-plugins`, Cursor **Developer: Reload Window**.
- **Verify:** distinguish “plugin loaded” from “hook executed.” Provide a bundled diagnostic that feeds safe and denied sample payloads directly to the hook without executing the denied command.
- **Security behavior:** state that malformed input or missing dependencies block shell execution and tell users how to diagnose it.
- **Migration:** warn users to remove prior manually registered copies/symlinks so the hook does not run twice.

Recommended verification UX to evaluate in specification:

1. A local validator for maintainers covering policy behavior and all three wire protocols.
2. A small installed-path doctor for users that checks interpreter/dependencies, resolves plugin-relative files, and simulates one allow plus one deny payload.
3. Harness-native visibility checks: `/hooks` in Codex, `/hooks` or plugin details in Claude Code, and **Customize → Hooks** plus the Hooks output channel in Cursor.

### 11. Validation work required if implementation is approved

- Preserve and port all existing regression cases before changing policy behavior.
- Run production syntax checks and regressions with the oldest supported macOS `/bin/zsh` behavior and the current macOS zsh release.
- Add malformed JSON, missing `jq`, missing `git`, missing source hook, paths with spaces, newlines, quotes, Unicode, and symlinked plugin-root cases.
- Validate Codex and Claude `PreToolUse` payload/output contracts independently even though they share an adapter.
- Validate Cursor `beforeShellExecution` with `failClosed: false`, safe allow, policy deny, invalid output, timeout, and missing-runtime cases.
- Re-run the Buddy cross-harness validator: `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`.
- Run the current Agent Skills validator, Codex plugin validator, `claude plugin validate --strict .`, and Cursor's published schema/validator as required by the repository instructions.
- Test actual local plugin loading in all three harnesses because manifest/schema validation alone cannot prove hook command path resolution or trust behavior.
- Benchmark the allow path; a hook that runs before every shell execution must remain effectively unnoticeable.

### 12. Cloud-agent implications

Cloud support changes the runtime and registration conclusions materially.

#### Cursor Cloud Agents

Verified from current Cursor documentation:

- Cursor says plugins work across desktop, web, and CLI, so the Buddy workflow plugin can be available on Cursor's web surface.
- Cursor Cloud Agents run inside isolated Ubuntu VMs, not on the user's Mac.
- Cloud Agents support command-based `beforeShellExecution`, `preToolUse`, and the other documented tool hooks needed for this guard.
- Prompt-based hooks are not supported in Cloud Agents.
- Hooks do not run during early read-only exploratory turns. They begin running once the agent receives a writable environment.
- Cloud Agents load hooks from repository `.cursor/hooks.json`, Enterprise team hooks, and enterprise-managed hooks.
- User hooks under `~/.cursor/hooks.json` are unavailable because the VM cannot see the user's local home directory.
- Cursor's documented Cloud Agent hook-source list does not include hook registries bundled inside an installed Marketplace plugin.

Sources: [Cursor hooks: Cloud agent support](https://cursor.com/docs/hooks.md#cloud-agent-support), [Cursor Cloud Agents](https://cursor.com/docs/cloud-agent.md), [Cursor Cloud Environment Setup](https://cursor.com/docs/cloud-agent/setup.md), [Cursor plugins](https://cursor.com/help/customization/plugins.md).

Inference: plugin availability in Cursor web does not currently prove that Buddy's bundled `hooks/cursor/hooks.json` is registered inside a Cloud Agent VM. The official documentation explicitly establishes repository, team, and enterprise hook sources but is silent about plugin-bundled hooks. Treat automatic plugin-hook execution in Cursor Cloud Agents as unverified until an installed Marketplace build is tested or Cursor documents it.

This creates two separate cloud requirements:

1. **Registration:** the Cloud Agent must receive a supported hook source. For non-Enterprise users, the documented reliable route is a committed `.cursor/hooks.json` plus its command script in each target repository. Enterprise users can use centrally distributed team or managed hooks.
2. **Runtime:** the hook runs on Ubuntu. System `/bin/zsh`, Homebrew paths, and macOS-only tools cannot be assumed. The Cloud Agent environment can install system dependencies through its Dockerfile or `.cursor/environment.json`, but that is environment setup outside the plugin manifest.

Possible delivery patterns for a later specification:

- **Repository companion installation:** Buddy provides a command or skill that copies a small `.cursor/hooks.json` and hook implementation into the target repository for review and commit. This is the strongest documented non-Enterprise cloud path, but it means the plugin alone is not sufficient and the repository gains Buddy-specific files.
- **Enterprise distribution:** publish the hook as a Cursor team/enterprise hook. This avoids per-repository copies but requires an Enterprise administrator.
- **Configured cloud image:** install zsh, `jq`, and other prerequisites in the repository's Cursor Cloud Agent Dockerfile and commit `.cursor/hooks.json`. This preserves the current engine but adds per-environment setup.
- **Portable single runtime:** port the policy to a runtime guaranteed or explicitly installed in both macOS and Ubuntu environments. A Bash port becomes more valuable under this requirement, although JSON handling remains unresolved.

An agent-invoked bootstrap after the cloud task starts is not a complete safety solution: commands executed before the bootstrap would be unguarded, early read-only turns do not run hooks, and the bootstrap would mutate the target repository.

#### Codex cloud and Claude Code on the web

Current official Codex documentation establishes plugin-bundled hooks for Codex local clients but does not establish that those hooks execute inside Codex cloud tasks. Current Claude Code web documentation describes cloud environments and setup scripts but does not establish that locally installed marketplace plugins or their hooks are carried into web cloud sessions.

Inference: do not claim cloud hook enforcement for Codex cloud or Claude Code web until each provider documents it or an integration test proves it. Their local CLI hook support is not evidence of remote hook execution.

#### Revised portability consequence

If Cursor Cloud Agents are a required first-class target, the macOS-only `/bin/zsh` proposal is insufficient as the universal implementation. The specification must choose between:

- requiring zsh and `jq` in the Cursor Ubuntu environment;
- implementing and testing one Bash-compatible engine across stock macOS Bash 3.2 and Ubuntu Bash;
- shipping another explicitly provisioned cross-platform runtime;
- or documenting the destructive hook as local-only while Buddy's skills remain cloud-compatible.

### 13. Initial scope decision

Decision recorded on 2026-08-05:

- Start with the existing zsh implementation and optimize for the known macOS path.
- Do not port the policy engine to Bash or POSIX `sh` preemptively.
- Do not add Windows-specific support in the initial implementation.
- Do not block the first implementation on automatic Cursor Cloud Agent hook enforcement or an Ubuntu-native runtime.
- Keep the cross-harness packaging explicit and document the currently verified support boundary.
- When a real environment fails because zsh, dependencies, or plugin-provided hooks are unavailable, use that concrete failure to drive the next portability change.

This decision intentionally favors shipping the audited implementation over solving hypothetical runtime coverage. It does not claim that the destructive hook is enforced in every cloud environment; Buddy's skills may remain usable where its hook is not active.

## INFERENCES

- For a macOS-first release, Apple's system `/bin/zsh` is a better baseline than Homebrew Bash 5.3: it is already present, has a stable absolute path, and preserves the audited tokenizer.
- `jq` is replaceable only by another trustworthy JSON codec; `git` should remain the source of truth for worktree boundaries, though its lookup can potentially become lazy.
- Proposal A remains the most direct later expansion path for Linux users who have Bash but not zsh, provided the project accepts `jq` and `git` as explicit prerequisites.
- Cursor Cloud Agent enforcement is intentionally deferred until concrete usage exposes the required registration and runtime changes.
- Proposal B is the path toward a closer-to-zero-dependency shell hook, but it carries more parsing risk than the zsh-to-Bash policy rewrite itself.
- The Context Mode packaging pattern is worth adopting structurally, but its current Codex feature-flag instructions are not a safe source to copy verbatim.
- A plugin-bundled hook should be default-registered but transparently documented because it changes the behavior of every shell command attempted by the harness.

## UNKNOWNS

- Are `jq` and `git` acceptable explicit prerequisites, or must the installed hook work with only a stock shell?
- Should Linux systems with an already-installed zsh be documented as best-effort or left entirely unsupported initially?
- When Cursor Cloud Agent enforcement becomes necessary, is a reviewed per-repository `.cursor/hooks.json` companion acceptable?
- Do Cursor Marketplace plugin hook registries execute in Cloud Agents despite being omitted from the documented cloud hook-source list? This requires a published/local integration test or confirmation from Cursor.
- Must the existing destructive-command policy remain behavior-identical, or may the first Buddy version intentionally support a smaller audited rule set?
- Cursor's official docs show relative hook commands but do not establish a cross-version plugin-root environment variable equivalent to Codex/Claude. The exact command working directory/path behavior must be verified with a locally loaded Buddy plugin before choosing the Cursor command string.
- Should hook verification be a standalone script, a Buddy skill, or both? Context Mode's doctor is effective, but Buddy currently has no runtime CLI.
