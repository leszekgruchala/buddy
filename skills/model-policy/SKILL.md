---
name: model-policy
description: Shared model-selection policy for all skills and agents. Defines tier→model mapping per harness, stage→tier mapping, and dispatch discipline. Read before dispatching subagents.
---

# Model Selection Policy

This is a reference-only skill. It selects no workflow stage, grants no transition, and must return control to the active skill after resolving a model tier. Do not activate another Buddy skill from this reference.

Single source of truth for tier→model mapping and dispatch discipline, shared by all skills and agents. Update concrete model names here only.

## Tiers

- `fast` — default for normal implementation after planning, mechanical edits, narrow scope, low-risk changes, parallel fan-out over small files.
- `balanced` — codebase research, integration-heavy implementation, debugging, or implementation phases whose brief names moderate ambiguity.
- `frontier` — architecture, ambiguous design, cross-cutting refactors, planning, ideation.

## Stage → tier

| Stage | Tier | Who runs it |
|-------|------|-------------|
| research | balanced | dispatched `researcher` subagent |
| innovate (optional, after research) | frontier | dispatched `innovator` subagent |
| create-plan | frontier | dispatched planner subagent |
| implement | fast (default phase tier) | per-phase `implementor` subagents |

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
  fast:     gpt-5.5-low
  balanced: gpt-5.5-medium
  frontier: gpt-5.5-high
gemini_cli:
  fast:     gemini-3.1-flash-lite
  balanced: gemini-3.1-flash
  frontier: gemini-3.1-pro
# opencode / unknown: omit model; inherit parent default.
```

## Reasoning controls

Pass an optional reasoning control only when the chosen model and live interface support it. When support is unclear, omit it.

## Dispatch discipline

1. Resolve the stage's tier from the table above.
2. Look up the concrete model for the current harness.
3. Pass `model` to the dispatch only if that exact string is in the live allowed list; else omit.
4. Never translate, abbreviate, or borrow a model slug from another harness.
5. If a dispatch omits the model override, the worker inherits the orchestrator default; this is the required fallback for unsupported or unknown interfaces.
