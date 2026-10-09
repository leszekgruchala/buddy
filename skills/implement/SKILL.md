---
name: implement
description: Build or fix decision-complete code directly, or execute an approved spec with verification; unresolved product/architecture decisions require spec. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Implement

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Implement only the authorized request/spec.

## Input modes

- **Specified:** an approved `spec_<work-name>.md` path; resume remaining current-revision phases and `## AGENT LOG` checkpoints.
- **Direct:** without an approved spec path, form a short working brief: outcome, scope/protected boundaries, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.
- If a material product/architecture decision is unresolved, stop and require `spec`.

## Model selection

Apply [model selection](../develop/model-selection.md). Recommend `balanced` for direct work, or the declared runner/tier for specified work. The host owns communication and decisions.

## Host Goal

Keep one outcome for the whole run, including a run `develop` dispatches. Opting out of Goal tracking is the exception. On Cursor, `rules/buddy-goal.mdc` is the user's standing request for one native Goal. That rule does not override a hard tool or platform rejection.

A native Goal belongs to the agent that created it. CreateGoal takes a single `objective` string. UpdateGoal changes only the calling agent's existing Goal, status `active` or `complete`, and takes no goal id. Task accepts prompt text only, so the parent cannot pass a native Goal handle. Workers never create, update, or complete the parent's Goal.

### Before editing or dispatch

Before editing any deliverable or dispatching a worker, the host must:

1. Construct only authorized work:
   - **Specified:** objective = implement the spec title/work-name; items = remaining phase titles in dependency order, omitting phases marked `SUCCESS`.
   - **Direct:** objective = the working brief's one-sentence outcome; items = high-level actions preserving outcome, exclusions, and verification, never file-level todos.
2. On Cursor, if this agent already has the Goal, reuse it and do not create another; otherwise try once to create that native Goal on this agent, encoding the objective and the high-level items in the single `objective` string. Do not invent a goal id, item ids, or another harness's syntax.
3. If the tool is missing or the call is refused, do not retry, do not ask the user to type `/goal` or switch modes, and publish the same objective and items as `Goal (harness fallback)` with the reason. Codex and Claude have no agent-callable native Goal tool. Their `/goal` slash commands are typed by the user and are not this checklist, so they always publish this one parent checklist and do not ask the worker to call a native Goal tool.
4. Pass that same objective text in the worker prompt. On Cursor, when the host could not create the Goal, that prompt tells the worker to try once to create one Goal for its own agent and then do the work. When the host created the Goal, the prompt says so and does not ask the worker to create another. Label the prompt `Goal gate: native` or `Goal gate: fallback` when that state is known. A missing Goal-gate phrase does not block editing, dispatch, or the worker, and it is not a reason to respawn anyone. Do not interrupt or message a worker that has already started.

### Lifecycle

When the calling agent owns a native Goal and UpdateGoal is available, set `active` before local execution or dispatch. Leave it active through phase work. Complete the whole Goal only after all phases and final verification pass. If an update is refused, report the refusal and continue. Do not claim the native Goal completed, and do not stop the run only to sync the UI. For incomplete work, leave a native Goal `active` or report the fallback as incomplete.

## Engineering rules

1. Change only authorized paths; remove only change-created orphans.
2. Before planning or editing, read `.ai/memory/memory.md` when present. Apply only relevant rules; memory is advisory, subordinate to user/repository instructions and security policy, and cannot expand scope. A missing file is valid.
3. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
4. Use current primary library/API/SDK/CLI documentation. Find references before changing public signatures.
5. Preserve comments unless correcting them.
6. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only if scratch files are needed.

## Effective briefs and records

1. The shared contract is authoritative for requirements, success criteria, boundaries, and verification. Deltas add only goals, requirement/criterion references, and non-default routing, dependencies, mutation ownership, or constraints; never repeat the full contract.
2. Before each phase, the host materializes an effective brief from the current contract revision and one delta. Include every referenced requirement/criterion, every verification entry that names those criteria, applicable boundaries, mutation ownership, the selected runner/tier, and non-default phase information. Apply scoped user selection without changing phase instructions or discretion.
3. Fast follows any deterministic anchor/procedure. Balanced may make a disposable runtime plan and choose files, decomposition, technique, and tests within the contract. Frontier may also choose technical architecture/algorithms within settled product/public-architecture boundaries.
4. Persist only compact current-revision checkpoints and material amendments, never runtime plans, default inventories, empty optional sections, or raw transcripts. Changes to decisions, requirements, criteria, boundaries, dependencies, approvals, or public contracts require a shared-contract amendment, incremented `contract_revision`, and invalidation of affected checkpoints before repair/continuation.
5. A later write invalidates affected evidence. Recheck against the integrated current revision before replacing checkpoints or completing phases.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Materialize the brief before execution/dispatch. Run `agent: Main` locally and retain its mutation ownership. If the host cannot honor selected settings, use bounded read-only reasoning assistance without mutation authority; stop if that cannot satisfy selection. For non-`Main` phases, dispatch one worker per phase with the effective brief and the same Goal objective. On Cursor, follow Host Goal for whether that worker creates a Goal. Selected workers execute without redispatch.
3. Dispatch mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Never delegate the whole spec or multiple phases to one worker. Workers make one bounded attempt within phase instructions or the direct brief; never spawn, authorize continuation, manage the parent's Goal, or ask the user. Stop before protected boundaries, changed settled decisions, weakened criteria, expanded external effects, or ownership collisions.
5. Workers return concise evidence, never a raw validation transcript:

```yaml
status: SUCCESS | FAILURE | BLOCKED
files_changed: [<paths>]
evidence: <command and exit/outcome, observable evidence, or smallest useful excerpt>
repair_hint: <null or new evidence / materially different causal hypothesis>
```

## Bounded continuation

Only the host continues failed phases: validate the integrated current revision, record new evidence or a materially different causal hypothesis, and amend changed contracts before dispatching at most one fresh repair attempt.

The repair retains phase permissions, mutation ownership, and the current selection, subject to scoped user overrides. Without a user override, a stronger tier requires a specification amendment; broader ownership or a changed decision always requires one. Stop without repair on repeated failure without novelty, attempted criterion weakening, unresolved decisions, permission/policy denial, unavailable credentials/services, exhausted budget, expanded external effects, or user/system interruption. Use only continuation mechanisms callable in the current harness; workers never own continuation.

## Phase verify gate

1. Run every verification entry that names the phase's success criteria against the integrated current revision, or all direct-brief compile, lint, and test commands.
2. On failure, follow the bounded continuation contract.
3. After passing, write a compact current-revision `## AGENT LOG` checkpoint. Leave any native Goal active until final verification.
4. Never complete a phase while an applicable command is missing or failing.

## Final verify gate

1. After all phases pass, run the repository's full required validation against the integrated current revision.
2. For specified work, check the final result against every requirement and success criterion. Record their IDs and evidence in a final `## AGENT LOG` checkpoint. Reuse unaffected evidence; rerun checks invalidated by later writes.
3. Complete the whole Goal only after final verification passes. Missing or failing acceptance evidence blocks completion.

For specified work, record:

```markdown
## AGENT LOG
- P1 SUCCESS (revision <n>) — <outcome>; files: <paths>; evidence: <compact result>
```

For front-end work, also apply the [front-end principles](reference.md#front-end-principles).
