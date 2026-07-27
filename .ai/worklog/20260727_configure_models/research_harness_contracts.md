# Harness contracts for configurable model policy

## QUESTION

What current Agent Skills, Codex, Cursor, and Claude Code contracts constrain a user-facing `configure-models` skill, a user-owned profile that survives plugin updates, exact model/reasoning/thinking representation, account-aware discovery, dispatch validation, and fallback?

## FINDINGS

### Recommended v1 boundary

- Keep `model-policy` as the resolver from Buddy stage to `fast` / `balanced` / `frontier`.
- Add one focused, user-facing `configure-models` skill. A single user profile is enough for v1; named profiles and general Buddy behavior settings are premature.
- Store personal choices outside the installed plugin. The most portable shared location is `~/.buddy/model-profile.yaml`, with one section per harness. Writing outside the current workspace can require normal harness approval.
- Do not require one universal scalar “full slug.” Preserve the exact dispatch representation of each harness:
  - Cursor: one exact model value, including supported bracket parameters when used.
  - Codex: exact `model` plus separate `model_reasoning_effort`.
  - Claude Code: exact `model` plus separate `effort`; extended thinking is inherited from the main conversation and has no per-subagent setting.
- Profile resolution should be: explicit current-task override → current harness profile section → packaged Buddy defaults → omit model override and inherit.
- Never silently translate, normalize, or substitute model names. If a stored definition no longer validates, report it and inherit.

Agent Skills and OpenAI both recommend keeping a skill focused on a recognizable user goal. `configure-models` fits that guidance better than expanding the reference-only `model-policy` into an interactive setup workflow.

Sources:

- https://agentskills.io/specification.md
- https://agentskills.io/skill-creation/best-practices.md
- https://developers.openai.com/plugins/build/skills.md

### Availability and validation are different layers

A model catalog is candidate discovery, not proof that Buddy's subagent dispatcher accepts the same value.

Validation should distinguish:

1. **Profile/schema validity**: required tiers and harness-native field shapes are correct.
2. **Catalog/account visibility**: the current first-party harness lists or exposes the model for the signed-in account.
3. **Dispatch compatibility**: the actual subagent interface accepts the exact model and reasoning/effort representation.
4. **Runtime eligibility**: plan, organization policy, provider configuration, and transient availability may still reject or replace a dispatch.

The configure skill should discover candidates first, intersect them with any enumerated live dispatch schema, and only claim complete validation after the actual dispatch surface confirms the value. If the dispatch schema accepts arbitrary strings, a bounded real subagent probe is the only conclusive check; ask before doing a potentially billable probe. A successful main-agent model selection is not conclusive evidence for subagents.

### Codex

Current installed CLI: `codex-cli 0.145.0`.

Verified commands:

```bash
codex debug models --help
codex debug models
```

`codex debug models` is officially documented as printing “the raw model catalog Codex sees as JSON”; without `--bundled`, it refreshes from the remote models endpoint. Its current objects include `slug`, `supported_reasoning_levels`, and `default_reasoning_level`. On this machine the catalog currently exposes, among others:

- `gpt-5.6-sol`: `low`, `medium`, `high`, `xhigh`, `max`, `ultra`
- `gpt-5.6-terra`: `low`, `medium`, `high`, `xhigh`, `max`, `ultra`
- `gpt-5.6-luna`: `low`, `medium`, `high`, `xhigh`, `max`

Codex configuration and custom-agent files use separate values:

```toml
model = "gpt-5.6-sol"
model_reasoning_effort = "high"
```

Do not invent a combined Codex slug. Catalog presence still does not prove that a particular host-provided dispatch tool permits the model. For example, this Codex session's live subagent tool schema exposes a narrower enumerated model set than the CLI catalog. The live tool schema therefore remains the authority for dispatch.

Codex installs plugins into a versioned cache:

```text
~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/
```

The installed skill must not edit that cache. `PLUGIN_DATA` is a writable plugin data directory, but current OpenAI documentation exposes it specifically to plugin hook commands (with compatible `CLAUDE_PLUGIN_DATA`); it is not documented as a general persistence API directly available to a pure skill. That makes a neutral user-owned profile clearer for a skill-only v1.

Sources:

- https://developers.openai.com/codex/subagents.md
- https://developers.openai.com/codex/config-reference.md
- https://developers.openai.com/plugins/build/plugins.md
- current official Codex manual fetched through the `openai-docs` helper

### Cursor

Current installed Cursor Agent: `2026.06.04-5fd875e`.

Verified commands:

```bash
cursor-agent models --help
cursor-agent models
```

The installed help explicitly describes `cursor-agent models` as “List available models for this account.” Its output provides exact selectable IDs, including reasoning/thinking/fast variants. It is the best account-aware discovery source available to the skill.

Current Cursor subagent documentation defines:

- `model: inherit` as the default.
- A specific model ID as an exact requested model.
- Model parameters appended in brackets as `id=value` pairs, for example:
  - `composer-2.5[]`
  - `composer-2.5[fast=false]`
  - `claude-opus-5[effort=high]`
  - `claude-opus-5[effort=high,context=300k]`

Options are model-dependent. The configure skill must copy an exact ID from the account-aware list and add only parameters documented/surfaced for that model; it must not synthesize a slug by analogy. Because the CLI list currently also prints flattened variant IDs such as `claude-opus-5-thinking-high`, the skill should preserve exactly what the current account-aware interface returns or accepts rather than rewriting it into bracket form.

Cursor documents conditions under which a requested subagent model is not honored, including team-admin restrictions, legacy Max Mode settings, and plan limitations. Therefore `cursor-agent models` proves account catalog visibility but not final subagent execution. Validate against a live dispatch enum if one exists; otherwise use a bounded probe or report “catalog-validated, dispatch-unverified.”

Cursor documents user-global skills at `~/.agents/skills/` or `~/.cursor/skills/`, but its plugin documentation does not document a general per-plugin persistent writable data directory for skills. Plugin `variables` are admin/user-provided dashboard values used as placeholders in plugin configuration; they are not an appropriate arbitrary YAML profile store.

Sources:

- https://cursor.com/docs/subagents.md
- https://cursor.com/docs/skills.md
- https://cursor.com/docs/reference/plugins.md
- https://cursor.com/docs/plugins.md
- installed `cursor-agent --help`

### Claude Code

Current installed Claude Code: `2.1.212`.

Verified commands:

```bash
claude --help
claude plugin --help
claude plugin validate --help
```

The installed CLI accepts:

- `--model <model>`: alias or full model name.
- `--effort <level>`: `low`, `medium`, `high`, `xhigh`, or `max`.

Current subagent frontmatter has separate `model` and `effort` fields:

```yaml
model: claude-opus-5
effort: high
```

`model` accepts `sonnet`, `opus`, `haiku`, `fable`, a full model ID, or `inherit`. Supported effort levels depend on the model. Claude Code may reduce an unsupported effort to the highest supported level at or below it, so the configurator should reject or explicitly warn instead of treating that fallback as exact validation.

Critical correction to the current Buddy mapping: strings such as `claude-opus-5-thinking-high` are Cursor-style identifiers, not the documented Claude Code subagent representation. As of Claude Code 2.1.198, subagents inherit the main conversation's extended-thinking state; there is no per-subagent thinking setting. Buddy must not claim it can pin thinking per Claude subagent.

Claude Code validates requested subagent models against the organization's `availableModels` allowlist. Excluded values are skipped and the inherited model is used. The interactive `/model` picker reflects account/organization visibility, but the installed CLI exposes no `models` listing command equivalent to Cursor's. A pure skill therefore cannot fully enumerate Claude account availability non-interactively from CLI help alone. It can:

- use documented aliases/full IDs and inspect readable `availableModels` policy when present;
- ask the user to select/confirm an entry shown by `/model`;
- use a bounded real invocation only with approval when conclusive validation is required.

Claude marketplace plugins are copied into `~/.claude/plugins/cache`; version directories are replaced/orphaned during updates, so installed plugin files are not user configuration. `${CLAUDE_PLUGIN_DATA}` is documented as a persistent directory surviving updates, and placeholders can appear in skill content, but using it would be Claude-specific. A shared `~/.buddy/model-profile.yaml` keeps the same profile contract across harnesses.

Sources:

- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/model-config.md
- https://code.claude.com/docs/en/plugins-reference.md
- https://code.claude.com/docs/en/plugins.md
- https://code.claude.com/docs/en/settings.md
- installed `claude --help`

### Suggested minimal profile contract

Use explicit harness-native shapes and require all three tiers in a configured harness section:

```yaml
version: 1

harnesses:
  cursor:
    fast: composer-2.5-fast
    balanced: inherit
    frontier: claude-opus-5[effort=high]

  codex:
    fast:
      model: gpt-5.6-terra
      model_reasoning_effort: low
    balanced: inherit
    frontier:
      model: gpt-5.6-sol
      model_reasoning_effort: high

  claude_code:
    fast:
      model: claude-sonnet-5
      effort: low
    balanced: inherit
    frontier:
      model: claude-opus-5
      effort: high
```

`inherit` should be the complete tier value, not a model slug. The configurator should update only the current harness section and preserve other harness sections.

## UNKNOWNS

- Cursor's current public plugin docs do not specify a general per-plugin writable data directory or installed cache path suitable for skill-owned persistent preferences.
- Codex `PLUGIN_DATA` is documented for hook commands, not as a directly readable/writable environment contract for pure skill execution.
- Claude Code provides no verified non-interactive, account-aware `models` listing command in installed CLI `2.1.212`; `/model` plus organization settings or an approved live probe is required for stronger validation.
- Catalog/account visibility cannot guarantee future runtime availability. Plan changes, admin policy, model retirement, and dispatch-schema changes require revalidation at use time.
