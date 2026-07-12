---
name: model-policy
description: Shared model-selection policy for all skills and agents. Defines tier→model mapping per harness, stage→tier mapping, and dispatch discipline. Read before dispatching subagents.
---

# Model Selection Policy

This is a reference-only skill. It selects no workflow stage, grants no transition, and must return control to the active skill after resolving a model tier. Do not activate another Buddy skill from this reference.

Single source of truth for tier→model mapping and dispatch discipline, shared by all skills and agents. Update concrete model names here only.

## Tiers

- `fast` — bounded fact collection, normal implementation after detailed planning, mechanical edits, narrow scope, low-risk changes, parallel fan-out over small files.
- `balanced` — codebase analysis, solution-oriented research, direct implementation without a detailed plan, integration-heavy implementation, debugging, or phases whose brief names moderate ambiguity.
- `frontier` — architecture, ambiguous design, cross-cutting refactors, planning, ideation.

## Stage → tier

| Stage | Tier | Who runs it |
|-------|------|-------------|
| research | balanced (default; `fast` for bounded fact collection) | dispatched `researcher` subagent |
| innovate (optional, after research) | frontier | dispatched `innovator` subagent |
| create-plan | frontier | dispatched planner subagent |
| implement with plan | fast (default phase tier) | per-phase `implementor` subagents |
| implement directly | balanced (default task tier) | host or bounded `implementor` subagent |

The orchestrator (`developer` agent) sequences stages and pins each dispatched subagent to its tier's model. The orchestrator's own session model is the user's choice; it sequences and integrates, while implementation phases rely on `implementor` subagents unless run locally as `Main`.

## tier → model per harness

Pass a model only if its exact string is supported by the live dispatch interface; otherwise inherit the parent default. Authority is always the live interface schema, never shell probes or environment variables.

```yaml
cursor:
  fast:     composer-2.5-fast
  balanced: glm-5.2-high
  frontier: gpt-5.5-high
claude_code:
  fast:     claude-sonnet-5-low
  balanced: claude-sonnet-5-thinking-high
  frontier: claude-opus-4-8-thinking-high
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
gemini_cli:
  fast:     gemini-3.1-flash-lite
  balanced: gemini-3.1-flash
  frontier: gemini-3.1-pro
# opencode / unknown: omit model; inherit parent default.
```

## Reasoning controls

For Codex, pass the tier's `model_reasoning_effort` with its `model` when the live dispatch interface supports both fields. For other harnesses, pass an optional reasoning control only when the chosen model and live interface support it. When support is unclear, omit it.

## Dispatch discipline

1. Resolve the stage's tier from the table above.
2. Look up the concrete model and any separate reasoning control for the current harness.
3. Pass `model` to the dispatch only if that exact string is in the live allowed list; else omit it and its reasoning control.
4. Pass the reasoning control only if its exact value is supported for that model by the live interface; else omit it.
5. Never translate, abbreviate, or borrow a model slug from another harness.
6. If a dispatch omits the model override, the worker inherits the orchestrator default; this is the required fallback for unsupported or unknown interfaces.
