---
name: research
description: Research code, behavior, docs, flows, comparisons, and technical facts without recommending or choosing changes; change decisions belong in spec. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Research

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Gather facts only. Do not recommend, decide, or implement.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

## Rules

1. Read code and current primary documentation; make no working-tree changes outside the required research artifact and its `trash/`.
2. Separate verified facts, inferences, and unknowns.
3. Stop when answered; omit unneeded implementation detail.
4. Ask only when the answer cannot be discovered safely.
5. Choices, preferences, and action-oriented follow-ups such as "let's do X" update the same research artifact; they do not authorize a spec or implementation. An explicit user transition or the calling `develop` orchestrator selects the next skill. Remain in research when intent is ambiguous.

## Research artifact

Resolve the path at the start. Reuse the relevant passed worklog and research artifact for follow-ups; otherwise use `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md` and `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` for temporary files. Do not create, hand off, or leave a scaffold-only research file. Write on material findings and update material conclusion changes. Before any user-facing handoff, record the question, direct outcome, evidence-backed findings, and unknowns concisely. Put the verified authoring runtime model slug in top YAML front matter under `model_slug`, following model selection; never use `inherit`, a tier, unresolved alias, or unverified requested model.

```markdown
---
model_slug: <exact runtime model slug>
---

# <research-name>

## QUESTION
<what was investigated>

## OUTCOME
<direct conclusion>

## FINDINGS
<concise findings with evidence>

## UNKNOWNS
- <remaining unknown; may be empty>
```
