---
name: model-policy
description: Resolve Buddy stage tiers to exact Codex, Cursor, or Claude Code subagent models. Read before dispatching agents to apply project/user profiles, packaged defaults, native reasoning fields, fallbacks, and live validation.
---

# Model Selection Policy

This reference selects no stage or transition. Resolve one tier, then return control to the active skill. Do not activate another Buddy skill.

This is the runtime source of truth for packaged tier mappings, profile resolution, and dispatch. Stored preferences belong in `.buddy/model-profile.yaml` or `~/.buddy/model-profile.yaml`, never this installed skill.

## Stage mappings

| Stage | Default | Runner |
|---|---|---|
| research | `balanced`; `fast` for bounded facts | `researcher` |
| innovate | `frontier` | `innovator` |
| spec | `frontier` | developer main agent |
| specified implement | declared phase tier | one `implementor` per phase |
| direct implement | selected by the active skill | host or bounded `implementor` |
| review code | `frontier` (required) | fresh independent reviewer |

Tier names select profile mappings; they do not promise relative cost or capability. The active skill selects a tier before dispatch. This policy resolves that selected tier; it does not choose a specified implementation phase tier. The `developer` orchestrator sequences stages and pins workers to their selected tier. Its own model remains the user's choice. Implementation uses per-phase implementors unless a phase says `Main`.

## Packaged defaults

Every packaged `fast`, `balanced`, and `frontier` definition must name a concrete model. Never set a packaged tier to `inherit`; if a requested model cannot be validated, keep the existing concrete definition and report the gap.

Use only when neither profile has the current product section:

```yaml
cursor:
  fast:     composer-2.5-fast
  balanced: grok-4.7-high-fast
  frontier: claude-opus-5-5-medium
claude_code:
  fast:
    model: claude-sonnet-5
    effort: low
  balanced:
    model: claude-sonnet-5
    effort: high
  frontier:
    model: claude-opus-5-5
    effort: high
codex:
  fast:
    model: gpt-6-sol
    model_reasoning_effort: low
  balanced:
    model: gpt-6-sol
    model_reasoning_effort: high
  frontier:
    model: gpt-6-astra
    model_reasoning_effort: medium
# opencode / unknown: omit model; inherit parent default.
```

## Resolution

Before dispatch, check both profile paths. If either exists, first read the complete [profile contract](reference.md).

### Mandatory review tier

Every review and re-review requires `frontier`, including direct skill and agent calls.
Resolve a concrete frontier model and supported effort through the precedence below.
For reviews, `inherit`, an invalid or unavailable mapping, or rejected dispatch returns
`BLOCKED`; never use the generic inheritance fallback or substitute another tier.
Pass the resolved model and effort in the reviewer brief and native dispatch fields.
An already dispatched frontier reviewer executes the review without dispatching again.
This review gate takes precedence over fallback instructions in this policy and its references.

For the selected tier, choose:

1. An explicit model override in the current task.
2. Project profile's current-product section.
3. User profile's current-product section, only if the project profile lacks it.
4. Packaged current-product default, only if both profiles lack it.
5. Orchestrator default when the selected value is `inherit`, invalid, incomplete, unsupported, or rejected by live dispatch.

A current-product section atomically replaces lower-priority mappings. File existence alone does not win: a project file lacking that section falls through to the user file. Never fill a missing, invalid, or rejected tier from a lower source. Preserve exact native strings and field names.

Resolution never edits profiles. Report a malformed or stale selected section, recommend `configure-models`, and omit its override.

When using packaged defaults, report once per top-level workflow: `Using Buddy's packaged model defaults because no project or user profile configures this harness. Run configure-models to personalize them.` Continue without repeating it per worker.

## Reasoning controls

Codex stores `model_reasoning_effort`; dispatch it with `model` only through the live interface's exact field (for example `reasoning_effort`), never an unsupported config key. For every product, pass reasoning/effort only when that exact model and live interface support it; otherwise omit it.

## Artifact provenance

Before a research or spec artifact is authored, establish its `model_slug`. For a concrete override, use the exact accepted runtime model slug. When dispatch omits an override or uses `inherit`, obtain the artifact author's concrete inherited runtime slug from the task or dispatch context. Pass that exact value to a worker that authors the artifact. Never substitute `inherit`, a tier, a profile source, or a packaged default. If the harness cannot expose the concrete inherited slug, report the missing provenance and do not write a false value.

## Dispatch

1. Resolve stage tier, then the explicit/profile/packaged definition.
2. Before every override, revalidate the exact model against the live dispatch allowed list; shell catalogs prove discovery, not dispatch. For Cursor, follow [cursor-task-dispatch.md](cursor-task-dispatch.md).
3. Send `model` only if its exact string is accepted. Send its exact reasoning/effort field and value only if supported for that model; otherwise omit the whole override.
4. Never translate, normalize, abbreviate, guess, substitute, or borrow a model slug across products.
5. If a saved definition is rejected, inherit and report that it needs reconfiguration; do not choose another concrete model.
6. Omitting the override makes the worker inherit the orchestrator default, the required fallback for unsupported or unknown interfaces.
