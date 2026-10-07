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

Apply [model selection](../develop/model-selection.md). Recommend `balanced` for direct work, or the declared runner/tier for specified work. The host owns communication, decisions, and the Goal lifecycle; dispatch follows its Goal gate.

## Host Goal

The host/main exclusively owns one user-visible Goal for the whole run, including runs from `develop`, using the current harness's native Goal/task-list capability. Workers never create, update, replace, or complete it.

### Pre-edit gate

Before editing any deliverable or dispatching a worker, the host must:

1. Construct only authorized work:
   - **Specified:** objective = implement the spec title/work-name; items = remaining phase titles in dependency order, omitting phases marked `SUCCESS`.
   - **Direct:** objective = the working brief's one-sentence outcome; items = high-level actions preserving outcome, exclusions, and verification, never file-level todos.
2. Inspect session product identity, callable native Goal/task-list capability, and live schema. Represent both the objective and every high-level item using supported fields/actions: if the schema has one objective/text field, encode both there; if it has structured tasks, create one per item and retain every returned native identifier. Create state only when user/system/host policy authorizes it; never guess APIs or copy another harness's syntax.
3. Fallback is allowed only with no callable native capability, unauthorized calls, or creation failure before native state exists. Publish the same objective/items as `Goal (harness fallback)` with the reason. If partial native state exists, reconcile/remove it by returned identifiers first; if impossible, stop before editing rather than create two views. Asking the user to run a command or switch modes does not pass this gate.

Do not edit or dispatch until this gate passes. Include `Goal gate: native` or `Goal gate: fallback` in every worker brief.

### Lifecycle

Immediately before local execution or dispatch, the host must mark the corresponding native item in progress when supported; multiple active items require approved parallel phases. Complete an item only when integrated success criteria pass and its Agent Log entry is written, using supported item status; otherwise preserve state without inventing updates. Complete the whole Goal only after all phases and final verification pass. On required update failure, stop before the next edit/dispatch and report the UI-sync blocker. For incomplete work, use a supported non-complete state or report the fallback as incomplete; never claim completion.

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
2. Materialize the brief before execution/dispatch. Run `agent: Main` locally and retain its mutation ownership. If the host cannot honor selected settings, use bounded read-only reasoning assistance without mutation authority; stop if that cannot satisfy selection. For non-`Main` phases, dispatch one worker per phase with Goal gate status and effective brief. Selected workers execute without redispatch.
3. Dispatch mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Never delegate the whole spec or multiple phases to one worker. Workers make one bounded attempt within phase instructions or the direct brief; never spawn, authorize continuation, manage the host Goal, or ask the user. Stop before protected boundaries, changed settled decisions, weakened criteria, expanded external effects, or ownership collisions.
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
3. After passing, write a compact current-revision `## AGENT LOG` checkpoint and complete the supported Goal item.
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
