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

### Keep the artifact short

- Keep only what answers the current question or is necessary to resume it. Aim for at most 300 words; the entire Markdown body, including optional sections, must not exceed 500 words unless the user explicitly requests a longer report. These are ceilings, not targets. Do not add appendices or companion reports to bypass them.
- Use one sentence for `QUESTION`, one to three for `OUTCOME`, and at most five short bullets in `FINDINGS`. Use a compact table only when it makes a comparison easier to read. Keep evidence links beside claims; label inferences and retain material limitations. Link to source detail instead of copying it.
- Keep only unresolved questions that affect the answer or next stage in `UNKNOWNS`; write `None` when there are none. Exclude investigation chronology, tool logs, session housekeeping, repeated caveats, implementation plans, and unrelated background.
- On every update, rewrite affected sections in place. Merge duplicates, replace superseded findings, and remove resolved unknowns. Do not append dated follow-ups, discussion transcripts, or earlier versions of the answer. If nothing material changed, do not write.
- Add `PAST DECISIONS` only when an earlier user or orchestrator decision prevents repeated exploration: at most three one-sentence bullets stating the decision and its brief reason. Record supplied decisions, not new research recommendations. Remove obsolete entries; revisit only when the user reopens them or new evidence invalidates their premise.
- Before every write and handoff, read the whole artifact, check the word count and section limits, and remove anything unnecessary. Preserve the direct answer, supporting evidence, material uncertainty, and still-applicable user constraints. If required content cannot fit after compression, report the conflict instead of silently dropping it or exceeding the limit.

```markdown
---
model_slug: <exact runtime model slug>
---

# <research-name>

## QUESTION
<current question in one sentence>

## OUTCOME
<direct conclusion>

## FINDINGS
- <essential fact or labeled inference with its evidence link>

## UNKNOWNS
- <material unresolved question, or None>
```
