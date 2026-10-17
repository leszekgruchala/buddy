---
name: research
description: Research code, behavior, docs, flows, comparisons, and technical facts without recommending or choosing changes; change decisions belong in spec. Keep the current request in this skill; route new requests by their own scope.
---

# Research

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

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

Resolve the path at the start. Reuse the relevant passed worklog and research artifact for follow-ups; otherwise use `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md` and `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` for temporary files. A follow-up that asks a different question about the same work adds a question to the same artifact. Do not create, hand off, or leave a scaffold-only research file. Write on material findings and update material conclusion changes. Before any user-facing handoff, record the questions, direct outcomes, evidence-backed findings, and unknowns concisely. Put the verified authoring runtime model slug in top YAML front matter under `model_slug`, following model selection; never use `inherit`, a tier, unresolved alias, or unverified requested model.

### Keep the artifact current

The artifact records what is true and relevant now, not how the research got there. Decide what to keep by evidence and relevance to the work, never by which question is newest.

On every update, reconcile the whole artifact before writing:

1. Check new evidence against every existing outcome, finding, unknown, and decision, not only those of the current question.
2. Correct or delete each item that evidence contradicts or invalidates. Do not keep it as history, strike it through, or mark it as earlier or previous. Record a ruled-out explanation or option only in `REJECTED`, and only when it prevents repeated investigation.
3. Keep every question whose answer still affects the work, with its outcome, findings, and evidence, also when the user asks a different question. A new, narrower, or related question does not supersede an earlier one. A question is superseded only when it is answered and no longer affects the work, evidence invalidates its premise, or the user drops it.
4. Remove resolved unknowns; keep their answers as findings when they still matter. Merge duplicates. Do not append dated follow-ups, discussion transcripts, or earlier versions of an answer.
5. If nothing material changed, do not write.

In the handoff, state in one line each material outcome, finding, question, or constraint that the update removed or reversed, and why. Do not report routine compression.

### Keep the artifact short

- Keep the artifact as short as its current, relevant content allows. There is no word limit: length follows content, not a target. Never drop, defer, or refuse to record still-relevant content to save words, and never pad.
- Per question, use one sentence for the question, one to three for its outcome, and only the short finding bullets that support it. Label items `Qn` and keep numbers stable; omit labels when there is one question. Use a compact table only when it makes a comparison easier to read. Keep evidence links beside claims; label inferences and retain material limitations. Link to source detail instead of copying it.
- Keep only unresolved questions that affect an outcome or the next stage in `UNKNOWNS`; write `None` when there are none. Exclude investigation chronology, tool logs, session housekeeping, repeated caveats, implementation plans, and unrelated background.
- Add `PAST DECISIONS` only for earlier user or orchestrator decisions and constraints that still apply or that prevent repeated exploration: at most three one-sentence bullets stating each and its brief reason. Record supplied decisions, not new research recommendations. Remove obsolete entries; revisit only when the user reopens them or new evidence invalidates their premise.
- Add `REJECTED` last, only for ideas, options, or explanations that the user, the orchestrator, or evidence ruled out and that would otherwise be revisited: one line each, naming it with the reason and evidence link. Keep no other trace of a rejected item in the artifact. Remove an entry once it no longer prevents repeated exploration; move it back only when the user reopens it or new evidence invalidates the reason.
- Before every write and handoff, read the whole artifact and keep only what is current and relevant: delete superseded detail, move ruled-out items to `REJECTED`, merge duplicates, and tighten wording. Never drop a still-relevant question, outcome, finding, material uncertainty, or applicable constraint.

```markdown
---
model_slug: <exact runtime model slug>
---

# <research-name>

## QUESTIONS
- Q1: <question that still affects the work, in one sentence>

## OUTCOME
- Q1: <direct conclusion>

## FINDINGS
- Q1: <essential fact or labeled inference with its evidence link>

## UNKNOWNS
- Q1: <material unresolved question>, or None
```
