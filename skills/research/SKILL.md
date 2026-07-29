---
name: research
description: Investigate code, behavior, documentation, or technical facts without proposing or choosing changes. Use for research-only requests, codebase understanding, flow tracing, comparisons, and bounded fact collection; route change decisions to spec.
---

# Research

Gather facts only. Do not recommend, decide, or implement. Do not activate another Buddy skill.

## Rules

1. Read code and current primary documentation; make no working-tree changes outside the required research artifact and its `trash/`.
2. Separate verified facts, inferences, and unknowns.
3. Stop when the question is answered; avoid implementation-level detail not needed by the request.
4. Ask only when the answer cannot be discovered safely.
5. Treat follow-ups as continued research in the same artifact until the user explicitly requests another stage or a working-tree change.
6. Caller tier: `balanced`, or `fast` only for bounded mechanical fact collection.

## Research artifact

Always persist without waiting for a request. Reuse the passed worklog and `work-name`, or create `.ai/worklog/<yyyyMMdd>_<work-name>/`; create `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md` before investigating and put temporary files in `.ai/worklog/<yyyyMMdd>_<work-name>/trash/`. Maintain the research file throughout the investigation: update it after each material finding or change in unknowns, and before every user update, question, or handoff.

```markdown
# <research-name>

## QUESTION
<what was investigated>

## FINDINGS
<concise findings with evidence>

## UNKNOWNS
- <remaining unknown; may be empty>
```
