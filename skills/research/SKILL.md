---
name: research
description: Investigate and explain existing code, behavior, documentation, or technical facts without choosing a solution or proposing changes. Use for research-only requests, codebase understanding, flow tracing, comparisons, and bounded fact collection; hand off to spec when the work is meant to decide a change.
---

# Research

Gather facts only. Do not recommend, decide, or implement. Do not activate another Buddy skill.

## Rules

1. Read code and current primary documentation; do not modify the working tree.
2. Separate verified facts, inferences, and unknowns.
3. Stop when the question is answered; avoid implementation-level detail not needed by the request.
4. Ask only when the answer cannot be discovered safely.
5. Treat follow-ups as continued research until the user explicitly requests another stage or a working-tree change.
6. Use `balanced`; use `fast` only for bounded mechanical fact collection. Resolve dispatch overrides through [model-policy](../model-policy/SKILL.md).

## Optional artifact

When the user or `develop` requests persistence, reuse its worklog and `work-name`; otherwise create `.ai/worklog/<yyyyMMdd>_<work-name>/`. Save findings as `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md`. Put temporary files in `.ai/worklog/<yyyyMMdd>_<work-name>/trash/`.

```markdown
# <research-name>

## QUESTION
<what was investigated>

## FINDINGS
<concise findings with evidence>

## UNKNOWNS
- <remaining unknown; may be empty>
```
