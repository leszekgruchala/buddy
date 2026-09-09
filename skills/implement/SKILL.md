---
name: implement
description: Implement or fix decision-complete code directly, or execute an approved spec phase with verification. Use for build/fix requests or an approved spec path; route unresolved product or architecture decisions to spec. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Implement

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Implement only the authorized request/spec. Do not expand scope or continue into unrelated work.

## Input modes

- **Specified:** the request references an approved `spec_<work-name>.md` path; resume its remaining current-revision phase checkpoints and `## AGENT LOG`.
- **Direct:** without an approved spec path, form a short working brief: outcome, scope and protected boundaries, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.
- If a material product/architecture decision is unresolved, stop and require `spec`.

## Host Goal

The host/main agent exclusively owns one user-visible Goal for the whole `implement` run, including runs dispatched by `develop`. Represent it through the current harness's native Goal/task-list capability so its UI shows the high-level work. Workers never create, update, replace, or complete it.

### Pre-edit gate

Before editing any deliverable or dispatching a worker, the host must:

1. Construct the Goal from only the authorized work:
   - **Specified:** objective = implement the spec title or work-name; items = remaining phase titles in dependency order, omitting phases marked `SUCCESS`.
   - **Direct:** objective = the working brief's one-sentence outcome; items = as many high-level actions as needed to preserve the outcome, exclusions, and verification, never file-level todos.
2. Inspect the current session's product identity, callable native Goal/task-list capability, and live schema. Represent both the objective and every high-level item with only supported fields and actions:
   - If the schema has one objective/text field, encode the objective and concise item list in that field.
   - If the schema has structured tasks, create one native task per item and retain every returned native identifier for later updates.
   - Create native state only when the current user/system/host policy authorizes the call; this skill does not override tool authorization requirements. Never guess an API or use another harness's syntax.
3. Fallback is allowed only when no native capability is callable, the call is not authorized, or creation fails before any native state exists. Publish the same objective and items under `Goal (harness fallback)` and state why the native lifecycle is unavailable. If partial native state exists, reconcile or remove it using its returned identifiers before falling back; if that cannot be done, stop before editing instead of creating two progress views. Asking the user to run a command or switch modes does not pass the gate.

Do not edit or dispatch until this gate passes. Include `Goal gate: native` or `Goal gate: fallback` in every worker brief.

### Lifecycle

Only the host manages the Goal and retains its native identifiers. Immediately before local phase execution or worker dispatch, mark the corresponding native item in progress when the schema supports item status; mark multiple items in progress only for phases already approved to run in parallel. Mark a phase/item complete only after its integrated success criteria pass and its Agent Log entry is written, and only when the native schema supports item-level completion; otherwise preserve its state without inventing an update. Complete the whole Goal only after all phases and final verification pass. If a required native update fails, stop before the next edit or dispatch and report the UI-sync blocker. If work stops incomplete, do not report or mark the Goal complete; use a supported non-complete state or report the fallback as incomplete.

## Engineering rules

1. Change only authorized paths; remove only change-created orphans.
2. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
3. Use current primary library/API/SDK/CLI documentation. Find references before changing public signatures.
4. Preserve comments unless correcting them.
5. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only if scratch files are needed.

## Effective briefs and records

1. The shared contract is authoritative for requirements, success criteria, boundaries, and verification. A phase delta adds only its goal, requirement and success references, and non-default routing, dependency, mutation ownership, or constraint information.
2. Before each phase, the host materializes an effective brief from the current contract revision and its one phase delta. Resolve and include every applicable requirement, success criterion, verification entry, boundary, mutation ownership, the selected tier, and any non-default phase information. Do not repeat the full contract in the phase delta.
3. A fast phase follows any deterministic anchor or procedure in the effective brief. A balanced phase may make a disposable runtime plan and choose files, local decomposition, technique, and tests inside the contract. A frontier phase may also choose technical architecture and algorithms inside settled product and public-architecture boundaries.
4. Do not persist runtime plans, default file inventories, empty optional sections, or raw worker transcripts. Persist only compact checkpoints for the current revision and material contract amendments. When a discovery changes a decision, requirement, criterion, boundary, dependency, approval, or public contract, amend the shared contract, increment `contract_revision`, and invalidate every affected earlier checkpoint before repair or continuation.
5. A later write invalidates affected evidence. Recheck the affected criteria against the integrated current revision before recording a replacement checkpoint or completing a phase.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Materialize the effective brief before local execution or dispatch. Run `agent: Main` locally; otherwise dispatch one worker for one phase, with its Goal gate status and effective brief.
3. Dispatch mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Resolve model and reasoning overrides through [model-policy](../model-policy/SKILL.md); omit unsupported values.
5. Never delegate the whole spec or multiple phases to one worker. A worker makes one bounded attempt, never spawns agents, never authorizes continuation, never manages the host Goal, and never asks the user.
6. For specified work, the worker may discover only the details allowed by its selected tier inside the effective brief. Direct workers stay inside the working brief. Every worker stops before crossing a protected boundary, changing a settled decision, weakening a criterion, expanding external effects, or colliding with another owner.
7. Workers return concise evidence, never a raw validation transcript:

```yaml
status: SUCCESS | FAILURE | BLOCKED
files_changed: [<paths>]
evidence: <command and exit/outcome, observable evidence, or smallest useful excerpt>
repair_hint: <null or new evidence / materially different causal hypothesis>
```

## Bounded continuation

Only the host may continue a failed phase. First validate the integrated current revision and record new evidence or a materially different causal hypothesis. Amend the shared contract if the new evidence changes it. The host may then dispatch at most one fresh repair attempt.

The repair retains the declared phase tier and mutation ownership. If it needs a stronger tier, broader ownership, or changed decision, stop and amend the specification. Stop without repair after repeated failure without novelty, attempted criterion weakening, an unresolved decision, permission or policy denial, unavailable credentials or services, exhausted budget, expanded external effects, or user or system interruption. Use only continuation mechanisms callable in the current harness; the worker never owns continuation.

## Phase verify gate

1. Run the phase success criteria against the integrated current revision, or all direct-brief compile, lint, and test commands.
2. On failure, follow the bounded continuation contract.
3. Only after a phase passes, write its compact current-revision `## AGENT LOG` checkpoint and complete its Goal item when supported.
4. Never complete a phase while an applicable command is missing or failing.

## Final verify gate

1. After all phases pass, run the repository's full required validation against the integrated current revision.
2. Complete the whole Goal only after final verification passes.

For specified work, record:

```markdown
## AGENT LOG
- P1 SUCCESS (revision <n>) — <outcome>; files: <paths>; evidence: <compact result>
```

For front-end work, also apply the [front-end principles](reference.md#front-end-principles).
