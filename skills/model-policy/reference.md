# Model profile contract

Buddy supports two optional model profiles with identical schemas:

```text
.buddy/model-profile.yaml
~/.buddy/model-profile.yaml
```

The project profile is repository-specific. Cloud agents receive it only when it is committed and included in their checkout. The user profile is a reusable local default outside the installed plugin cache, so plugin updates do not replace it; cloud or remote workers do not receive it automatically.

## Schema

The document must contain the integer `version: 1` and a `harnesses` mapping. Each configured harness section must define exactly the three tiers `fast`, `balanced`, and `frontier`.

```yaml
version: 1

harnesses:
  cursor:
    fast: composer-2.5-fast
    balanced: inherit
    frontier: claude-opus-5-thinking-high

  codex:
    fast:
      model: gpt-5.6-luna
      model_reasoning_effort: low
    balanced:
      model: gpt-5.6-terra
      model_reasoning_effort: medium
    frontier: inherit

  claude_code:
    fast:
      model: claude-sonnet-5
      effort: low
    balanced:
      model: claude-sonnet-5
      effort: high
    frontier: inherit
```

Harness sections are optional. Only `cursor`, `codex`, and `claude_code` are defined in version 1.

### Tier shapes

- `inherit` is a complete tier definition for every harness.
- Cursor uses an exact non-empty scalar model value. Preserve any thinking, effort, speed, context, or bracket parameters exactly as the current Cursor interfaces expose and accept them.
- Codex uses either `inherit` or a mapping with a non-empty `model` and optional non-empty `model_reasoning_effort`. Keep these as separate fields; never invent a combined Codex slug.
- Claude Code uses either `inherit` or a mapping with a non-empty `model` and optional non-empty `effort`. Do not claim a separate per-subagent thinking control unless the live Claude Code dispatch interface explicitly provides one.

Reject unsupported fields, missing tiers, empty values, duplicate keys, aliases, guessed identifiers, and harness-native values copied from another harness.

## Resolution and replacement semantics

A current-harness section is atomic configuration and fully replaces every lower-priority mapping for that harness. Configuration writes must include all three tiers and must preserve every unrelated harness section in the selected target file.

Resolve the current harness in this order:

1. `.buddy/model-profile.yaml`;
2. `~/.buddy/model-profile.yaml`;
3. Buddy's packaged defaults.

Precedence applies to the current-harness section, not whole-file existence. If the project file exists without the current harness, continue to the user profile. If a higher-priority current-harness section exists but is malformed, incomplete, or no longer accepted, report it and inherit instead of selecting a lower-priority concrete model.

At runtime:

- no current-harness section in either profile means use the packaged mapping and recommend `configure-models` non-blockingly once per top-level workflow;
- a valid concrete tier means use it only after live dispatch revalidation;
- `inherit` means omit the model and its reasoning or effort control;
- an invalid, incomplete, or no-longer-accepted configured tier inherits instead of falling back to a lower-priority or packaged concrete model;
- a malformed profile or current-harness section must be reported as needing reconfiguration and must not be silently rewritten.

During configuration, ask the user to select project or user scope before writing. Replace only the current-harness section in that file and do not copy unrelated sections from the other profile. A project profile can be committed and shared, so it must not contain secrets or private preferences the user does not want teammates to inherit.

## Validation layers

Validate each concrete tier separately:

1. **Profile/schema validity** — the document, harness section, tier presence, and native field shape satisfy this contract.
2. **Account/catalog visibility** — a current first-party account-aware source exposes the exact model and supported parameters.
3. **Dispatch compatibility** — the current live subagent interface accepts the exact model and reasoning or effort representation.
4. **Runtime eligibility** — plan, organization policy, provider configuration, and transient availability may still reject a later dispatch.

Use the reporting states `catalog-validated`, `dispatch-validated`, and `unverified`. Persist a concrete value only when both catalog visibility and dispatch compatibility are validated. Explicit `inherit` is valid without catalog or probe checks.

An enumerated live dispatch schema can validate compatibility without running a worker. When the dispatch accepts arbitrary strings, only a successful bounded real subagent probe is conclusive; obtain approval before consuming quota. Never treat a main-agent selection, catalog listing, or syntactically accepted value alone as dispatch validation.

## Current first-party discovery

Verify installed CLI help before invoking any command because harness capabilities and syntax can change.

- Codex: `codex debug models --help`, then `codex debug models`. Preserve its model slug and supported reasoning level separately, then intersect both with the live dispatch schema.
- Cursor: `cursor-agent models --help`, then `cursor-agent models`. Copy the exact account-visible value; do not synthesize model parameters by analogy.
- Claude Code: no noninteractive account-aware model-list command is assumed. Use a live dispatch enum when it reflects account eligibility, readable organization policy plus user confirmation, or an approved bounded probe. Otherwise mark the concrete value `unverified` and do not persist it.

Discovery proves candidate visibility, not dispatch acceptance. Revalidate the exact selected definition against the live dispatch interface during configuration and before every later override.
