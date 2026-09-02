---
name: research
description: Investigate code, behavior, documentation, or technical facts without proposing or choosing changes. Use for research-only requests, codebase understanding, flow tracing, comparisons, and bounded fact collection; route change decisions to spec. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Research

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Gather facts only. Do not recommend, decide, or implement.

## Rules

1. Read code and current primary documentation; make no working-tree changes outside the required research artifact and its `trash/`.
2. Separate verified facts, inferences, and unknowns.
3. Stop when the question is answered; avoid implementation-level detail not needed by the request.
4. Ask only when the answer cannot be discovered safely.
5. Treat choices, preferences, and action-oriented follow-ups, including "let's do X," as research inputs that update the same artifact; they do not authorize implementation or creation of a spec. Only an explicit user transition or the calling `develop` orchestrator selects another skill. When intent is ambiguous, remain in research.
6. Caller tier: `balanced`, or `fast` only for bounded mechanical fact collection.

## Research artifact

Always persist without waiting for a request. Reuse the passed worklog and `work-name`, or create `.ai/worklog/<yyyyMMdd>_<work-name>/`; create `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md` before investigating and put temporary files in `.ai/worklog/<yyyyMMdd>_<work-name>/trash/`. Maintain the research file throughout the investigation: update it after each material finding or change in unknowns, and before every user update, question, or handoff. Put the exact runtime model slug that authored the artifact in its top YAML front matter. If the task inherits its model, record the inherited model's exact slug; never record `inherit`, a tier, or a profile source instead.

```markdown
---
model_slug: <exact runtime model slug>
---

# <research-name>

## QUESTION
<what was investigated>

## FINDINGS
<concise findings with evidence>

## UNKNOWNS
- <remaining unknown; may be empty>
```
