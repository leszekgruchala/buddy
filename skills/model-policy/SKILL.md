---
name: model-policy
description: Shared model-selection policy for all skills and agents. Resolves stage tiers through optional project and user model profiles, packaged harness defaults, and live dispatch validation. Read before dispatching subagents.
---

# Model Selection Policy

This is a reference-only skill. It selects no workflow stage, grants no transition, and must return control to the active skill after resolving a model tier. Do not activate another Buddy skill from this reference.

Single source of truth for stage→tier mapping, packaged tier→model defaults, profile resolution, and dispatch discipline, shared by all skills and agents. Stored preferences belong in `.buddy/model-profile.yaml` or `~/.buddy/model-profile.yaml`, never in this installed skill.

## Tiers

- `fast` — bounded fact collection, normal implementation after a detailed spec, mechanical edits, narrow scope, low-risk changes, parallel fan-out over small files.
- `balanced` — codebase analysis, solution-oriented research, direct implementation without a detailed spec, integration-heavy implementation, debugging, or phases whose brief names moderate ambiguity.
- `frontier` — architecture, ambiguous design, cross-cutting refactors, decision settling inside spec, ideation.

## Stage → tier

| Stage | Tier | Who runs it |
|-------|------|-------------|
| research | balanced (`fast` for bounded fact collection) | dispatched `researcher` subagent |
| innovate | frontier | dispatched `innovator` subagent |
| spec | frontier | developer main agent |
| implement with spec | fast (default phase tier) | per-phase `implementor` subagents |
| implement directly | balanced (default task tier) | host or bounded `implementor` subagent |

The orchestrator (`developer` agent) sequences stages and pins each dispatched subagent to its tier's model. The orchestrator's own session model is the user's choice; it sequences and integrates, while implementation phases rely on `implementor` subagents unless run locally as `Main`.

## Packaged tier → model defaults

Use these mappings only when neither profile has a section for the current harness. Preserve them as the no-profile defaults maintained by the plugin author.

```yaml
cursor:
  fast:     composer-2.5
  balanced: cursor-grok-4.5-high
  frontier: kimi-k3-max
claude_code:
  fast:
    model: claude-sonnet-5
    effort: low
  balanced:
    model: claude-sonnet-5
    effort: high
  frontier:
    model: claude-opus-5
    effort: high
codex:
  fast:
    model: gpt-5.6-luna
    model_reasoning_effort: low
  balanced:
    model: gpt-5.6-terra
    model_reasoning_effort: medium
  frontier:
    model: gpt-5.6-sol
    model_reasoning_effort: high
# opencode / unknown: omit model; inherit parent default.
```

## Profile-aware resolution

Before dispatch, check `.buddy/model-profile.yaml` and `~/.buddy/model-profile.yaml`. If either exists, read the complete [model profile contract](reference.md) before resolving an override.

Resolve in this order:

1. An explicit model override in the current task.
2. The selected tier in the project profile's current-harness section.
3. The selected tier in the user profile's current-harness section, but only when the project profile has no current-harness section.
4. The packaged current-harness tier above, but only when neither profile has a current-harness section.
5. Inherit the orchestrator default when the selected definition is `inherit`, invalid, incomplete, unsupported, or no longer accepted by the live dispatch interface.

A profile section fully replaces every lower-priority mapping for its harness. Precedence applies per current-harness section, not merely per file: a project file without the current harness falls through to the user profile. Never fill a missing, invalid, or rejected tier from a lower-priority section or packaged defaults. Preserve exact harness-native strings and field names.

Do not edit either profile while resolving a dispatch. Report a malformed or stale selected current-harness section and recommend `configure-models`; omit the affected override for this dispatch.

When neither profile supplies the current harness, use the packaged defaults and report once at the start of the relevant top-level workflow: `Using Buddy's packaged model defaults because no project or user profile configures this harness. Run configure-models to personalize them.` This is non-blocking. Do not repeat it for every subagent dispatch in the same workflow.

## Reasoning controls

For Codex, `model_reasoning_effort` is the stored profile and packaged-policy key, not necessarily the dispatch field. Pass its value with the tier's `model` only through the exact reasoning field exposed by the live dispatch interface, such as `reasoning_effort`; never send an unsupported config-file key directly. For other harnesses, pass an optional reasoning control only when the chosen model and live interface support it. When support is unclear, omit it.

## Dispatch discipline

1. Resolve the stage's tier from the table above.
2. Resolve the current-task, profile, or packaged definition using the precedence above.
3. Revalidate the exact concrete model against the live dispatch allowed list before every override. A shell catalog is discovery evidence, not dispatch authority.
4. Pass `model` only when its exact string is accepted by the live dispatch interface; otherwise omit it and every associated reasoning or effort control.
5. Pass a reasoning or effort control only when its exact field and value are supported for that exact model by the live interface; otherwise omit the complete override.
6. Never translate, normalize, abbreviate, guess, silently substitute, or borrow a model slug from another harness.
7. If a saved definition is no longer accepted, inherit, report that the profile needs reconfiguration, and do not fall back to another concrete model.
8. If a dispatch omits the model override, the worker inherits the orchestrator default; this is the required fallback for unsupported or unknown interfaces.
