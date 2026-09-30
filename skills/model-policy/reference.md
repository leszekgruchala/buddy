# Model profile contract

Read for profile inspection, validation, or writes. Buddy's optional profiles share one schema:

```text
.buddy/model-profile.yaml
~/.buddy/model-profile.yaml
```

The project file is repository-specific and reaches cloud agents only when committed in their checkout. The local reusable user file survives plugin updates but is not automatically available remotely.

## Schema

Require integer `version: 1` and a `harnesses` mapping. Each configured section defines `fast`, `balanced`, and `frontier`, and should define `review`. `configure-models` always writes `review`; sections saved without it stay valid.

```yaml
version: 1

harnesses:
  cursor:
    fast: composer-2.5-fast
    balanced: grok-4.7-high-fast
    frontier: claude-opus-5-5-medium
    review: muse-spark-1.3-high

  codex:
    fast:
      model: gpt-6.1-sol
      model_reasoning_effort: low
    balanced:
      model: gpt-6.1-sol
      model_reasoning_effort: medium
    frontier:
      model: gpt-6.1-sol
      model_reasoning_effort: xhigh
    review:
      model: gpt-6.1-sol
      model_reasoning_effort: high

  claude_code:
    fast:
      model: sonnet
      effort: medium
    balanced:
      model: opus
      effort: medium
    frontier:
      model: opus
      effort: high
    review:
      model: opus
      effort: high
```

Sections are optional; version 1 defines only `cursor`, `codex`, and `claude_code`.

### Tier shapes

- Every product accepts `inherit` as a complete `fast`, `balanced`, or `frontier` definition; `inherit` is invalid for `review`.
- Cursor requires an exact non-empty scalar. Preserve thinking, effort, speed, context, or bracket parameters exactly as accepted.
- Codex requires `inherit` or non-empty `model` plus optional non-empty `model_reasoning_effort`; keep fields separate and never combine them into a slug.
- Claude Code requires `inherit` or non-empty `model` plus optional non-empty `effort`. `model` is one of Claude Code's documented aliases (`sonnet`, `opus`, `haiku`, `fable`) or a full model ID; both are exact native strings. Claim separate per-agent thinking control only if live dispatch exposes it. See [claude-code-dispatch.md](claude-code-dispatch.md).
- `review` is optional in a saved section for compatibility. When present, it uses the current product's native shape above and requires a concrete model; `inherit` is invalid for review.

Reject unsupported fields, a missing `fast`, `balanced`, or `frontier`, empty values, duplicate keys, aliases not documented for the current product, guessed identifiers, and harness-native values copied from another harness.

## Resolution and replacement

A current-product section is atomic: it replaces lower mappings, must contain `fast`, `balanced`, and `frontier`, and writes preserve unrelated sections in the target file.

Resolve:

1. `.buddy/model-profile.yaml`;
2. `~/.buddy/model-profile.yaml`;
3. Buddy's packaged defaults.

Precedence is per current-product section: a project file lacking it falls through. If neither profile has that section, use packaged defaults and recommend `configure-models` once per top-level workflow. A malformed file or selected section inherits the orchestrator default for non-review work; report it, never fall through to a lower concrete value, and never rewrite it silently. `inherit` omits model and reasoning/effort. Every concrete value requires live dispatch revalidation. Review uses the selected section's `review`, never its `frontier`. If a valid selected section has no `review`, review uses the packaged current-product `review` default, reports it, and recommends `configure-models`. A malformed section, `inherit` or an invalid selected review definition, no packaged default for the current product, or failed review dispatch blocks review under the mandatory review gate in [model-policy](SKILL.md); never fall through to another model.

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
- Claude Code: no noninteractive account-aware model-list command is assumed. Follow [claude-code-dispatch.md](claude-code-dispatch.md) to read the live Agent tool `model` enum and the current official docs. Otherwise use readable organization policy plus user confirmation, or an approved bounded probe. If none applies, mark the concrete value `unverified` and do not persist it.

Discovery proves visibility, not dispatch. Revalidate the exact definition during configuration and before every later override.
