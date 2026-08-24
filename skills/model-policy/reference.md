# Model profile contract

Read for profile inspection, validation, or writes. Buddy's optional profiles share one schema:

```text
.buddy/model-profile.yaml
~/.buddy/model-profile.yaml
```

The project file is repository-specific and reaches cloud agents only when committed in their checkout. The local reusable user file survives plugin updates but is not automatically available remotely.

## Schema

Require integer `version: 1` and a `harnesses` mapping. Each configured section defines exactly `fast`, `balanced`, and `frontier`.

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

Sections are optional; version 1 defines only `cursor`, `codex`, and `claude_code`.

### Tier shapes

- Every product accepts `inherit` as a complete definition.
- Cursor requires an exact non-empty scalar. Preserve thinking, effort, speed, context, or bracket parameters exactly as accepted.
- Codex requires `inherit` or non-empty `model` plus optional non-empty `model_reasoning_effort`; keep fields separate and never combine them into a slug.
- Claude Code requires `inherit` or non-empty `model` plus optional non-empty `effort`; claim separate per-agent thinking control only if live dispatch exposes it.

Reject unsupported fields, missing tiers, empty values, duplicate keys, aliases, guessed identifiers, and harness-native values copied from another harness.

## Resolution and replacement

A current-product section is atomic: it replaces lower mappings, must contain all tiers, and writes preserve unrelated sections in the target file.

Resolve:

1. `.buddy/model-profile.yaml`;
2. `~/.buddy/model-profile.yaml`;
3. Buddy's packaged defaults.

Precedence is per current-product section: a project file lacking it falls through. If neither profile has that section, use packaged defaults and recommend `configure-models` once per top-level workflow. A malformed file or selected section inherits the orchestrator default; report it, never fall through to a lower concrete value, and never rewrite it silently. `inherit` omits model and reasoning/effort. Every concrete value requires live dispatch revalidation.

Before writing, ask for project or user scope. Replace only that file's current-product section; preserve its other sections and copy none from the other profile. Warn that a commit can share project preferences; store no secrets or unwanted private preferences there.

## Validation layers

Validate each concrete tier independently:

1. **Profile/schema validity:** document, section, tiers, and native shapes satisfy this contract.
2. **Account/catalog visibility:** a current first-party account-aware source exposes the exact model and parameters.
3. **Dispatch compatibility:** live subagent dispatch accepts the exact model and reasoning/effort representation.
4. **Runtime eligibility:** plan, policy, provider, or transient availability may still reject later use.

Track `catalog-validated`, `dispatch-validated`, or `unverified`. Persist concrete values only when both validations pass; `inherit` needs neither.

An enumerated live schema can prove compatibility. If dispatch accepts arbitrary strings, only a successful bounded real-agent probe is conclusive; obtain approval before consuming quota. Main-agent selection, catalog listing, or syntactic acceptance alone is insufficient.

## Current first-party discovery

Verify installed CLI help first because syntax changes.

- Codex: `codex debug models --help`, then `codex debug models`; preserve model slug and reasoning level separately, then intersect both with live dispatch.
- Cursor: read [cursor-task-dispatch.md](cursor-task-dispatch.md) and apply it before any profile write. Use `cursor-agent models --help`, then `cursor-agent models` for account/catalog visibility only. Derive Task dispatch from the live **Task** tool `model` enum in the current session, or from the user's pasted result to `list Task-accepted models`. Intersect catalog and Task dispatch separately; never treat the catalog as the Buddy list.
- Claude Code: no noninteractive account-aware model-list command is assumed. Use a live dispatch enum when it reflects account eligibility, readable organization policy plus user confirmation, or an approved bounded probe. Otherwise mark the concrete value `unverified` and do not persist it.

Discovery proves visibility, not dispatch. Revalidate the exact definition during configuration and before every later override.
