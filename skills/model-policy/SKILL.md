---
name: model-policy
description: Shared model-selection policy for all skills and agents. Defines tier→model mapping per harness, stage→tier mapping, and dispatch discipline. Read before dispatching subagents.
disable-model-invocation: false
---

# Model Selection Policy

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

Pass a model only if its exact string is in the live Task/Subagent tool's allowed-model list; otherwise omit `model` and inherit the parent default. Authority is always the live tool schema, never shell probes or environment variables.

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

## reasoning_effort

Pass `reasoning_effort` only when the chosen model supports it. When support is unclear, omit it.

## Dispatch discipline

1. Resolve the stage's tier from the table above.
2. Look up the concrete model for the current harness.
3. Pass `model` to the Task/Subagent call only if that exact string is in the live allowed list; else omit.
4. Never translate, abbreviate, or borrow a model slug from another harness.
5. Worker agents declare `model: inherit from main agent` in their frontmatter — the orchestrator pins at dispatch. The dispatch-time `model` parameter overrides frontmatter. If a dispatch omits the pin, the worker inherits the orchestrator model (acceptable fallback).
