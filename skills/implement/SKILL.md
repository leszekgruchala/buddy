---
name: implement
description: Build or fix decision-complete code directly, or execute an approved spec with verification; unresolved product/architecture decisions require spec. Keep the current request in this skill; route new requests by their own scope.
---

# Implement

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

Resolve `.ai/` paths from the user's workspace root (its git root), never from the skill or plugin directory.

Implement only the authorized request/spec. Apply [change size](../develop/change-size.md) before editing or dispatch.

## Input modes

- **Specified:** an approved `spec_<work-name>.md` path; resume remaining current-revision phases and `## AGENT LOG` checkpoints.
- **Direct:** without an approved spec path, form a short working brief: outcome, scope/protected boundaries, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.
- If a material product/architecture decision is unresolved, stop and require `spec`.

## Model selection

Apply [model selection](../develop/model-selection.md). Recommend `balanced` for direct work, or the declared runner/tier for specified work. The host owns communication and decisions.

## Host Goal

Keep one outcome for the whole run, including a run `develop` dispatches. Before editing any deliverable or dispatching a worker:

1. Objective: for specified work, the spec title plus remaining phase titles in dependency order, omitting phases marked `SUCCESS`; for direct work, the working brief's one-sentence outcome plus high-level actions, never file-level todos.
2. On Cursor, `rules/buddy-goal.mdc` requests one native Goal: reuse this agent's Goal or try once to create that native Goal with the objective as its single `objective` string, then set it `active`. Codex and Claude have no agent-callable native Goal tool. When the tool is missing or refused, do not retry, do not ask the user to type `/goal` or switch modes, and publish the objective as `Goal (harness fallback)` with the reason.
3. Put the objective in each worker prompt. On Cursor without a host Goal, tell the worker to create one Goal for its own agent. Workers never create, update, or complete the parent's Goal. A missing Goal-gate phrase does not block editing, dispatch, or the worker. Do not interrupt or message a worker that has already started.
4. Complete the whole Goal only after all phases and final verification pass. Report a refused update and continue; never claim a refused Goal completed or stop the run only to sync the Goal.

## Worker

When the host dispatches you for one phase or one direct brief:

1. Require the brief: for specified work, the current contract revision, one phase delta, resolved requirements, success criteria, verification, boundaries, mutation ownership, and selected tier; for direct work, the working brief and selected tier. Without it, return `BLOCKED` without editing.
2. Make one bounded attempt for one phase within its instructions or the direct brief and the tier's discretion. Do not spawn agents, authorize repair or continuation, or ask the user. Stop before protected boundaries, changed settled decisions, weakened criteria, expanded external effects, or ownership collisions. Do not persist a runtime plan or raw transcript.
3. A missing `Goal gate:` phrase is not a reason to return `BLOCKED`. When the brief tells you to create a Goal for your own agent, try that call once; if refused, continue and report it. Never create, update, or complete the parent's Goal. Do not interrupt or message any agent that has already started.
4. Report a material discovery that needs a contract amendment. Return the result in the Spec execution format.

## Engineering rules

1. Change only authorized paths; remove only change-created orphans. An existing test is never an orphan.
2. Before planning or editing, read `.ai/memory/memory.md` from the main checkout, the first `worktree` path in `git worktree list --porcelain`, when present. Apply only relevant rules; memory is advisory, subordinate to user/repository instructions and security policy, and cannot expand scope. A missing file is valid.
3. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
4. Use current primary library/API/SDK/CLI documentation. Find references before changing public signatures.
5. Preserve comments unless correcting them.
6. As host of a run `develop` started, keep its [run state](../develop/SKILL.md#run-state) current. Workers never write it.
7. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only if scratch files are needed.

## Test changes

These rules apply when the change adds, edits, or deletes a test. A test edit that follows a behavior change is test work, not cleanup. `implement` owns these edits; do not activate `write-tests` for them.

1. Before the first test edit, load [test design](../write-tests/test-design.md).
2. Do not delete or rewrite an existing test unless the user asked. Coverage you believe exists elsewhere is not permission. Report a redundant test and leave it.
3. When a behavior change breaks an existing test, change only the assertions, calls, and test name that the change forces. If no such change can keep the test, ask the user before you delete it; a worker returns `BLOCKED`.
4. Where practical, break the behavior behind at least one new or changed assertion, confirm that the test fails, restore the code, and confirm that the diff matches the diff before the break.
5. Before verification, apply the final check in test design to the whole test diff: consistency, raised abstractions, coherence, and duplicates.
6. Before verification, the host writes this record to `test-changes.md` in the run's worklog folder, and updates it after each later test edit. For direct work without a worklog, create `.ai/worklog/<yyyyMMdd>_<work-name>/` for it. A worker returns the record in `test_changes`; the host writes the file. Do not keep the record only in a message, a brief, or a log entry:

```markdown
Test changes:
- Test design: loaded `write-tests/test-design.md`
- Protects: <behaviors the tests now protect>
- Existing tests: <none, or each deleted or rewritten test, the assertion change, and the behavior change or user request that required it>
- Redundant: <none, or each test reported and left>
- Break check: <what you broke, the failing test, and the clean restore; or why it is not practical>
- Final check: <abstractions raised or extended, duplicates removed, repetition reported; or no issues>
```

## Effective briefs and records

1. The shared contract is authoritative for requirements, success criteria, boundaries, and verification. Deltas add only goals, requirement/criterion references, and non-default routing, dependencies, mutation ownership, or constraints; never repeat the full contract.
2. Before each phase, the host materializes an effective brief from the current contract revision and one delta. Include every referenced requirement/criterion, every verification entry that names those criteria, applicable boundaries, mutation ownership, the selected runner/tier, and non-default phase information. Apply scoped user selection without changing phase instructions or discretion.
3. Fast follows any deterministic anchor/procedure. Balanced may make a disposable runtime plan and choose files, decomposition, technique, and tests within the contract. Frontier may also choose technical architecture/algorithms within settled product/public-architecture boundaries.
4. Persist only compact current-revision checkpoints and material amendments, never runtime plans, default inventories, empty optional sections, or raw transcripts. Changes to decisions, requirements, criteria, boundaries, dependencies, approvals, or public contracts require a shared-contract amendment, incremented `contract_revision`, and invalidation of affected checkpoints before repair/continuation.
5. A later write invalidates affected evidence. Recheck against the integrated current revision before replacing checkpoints or completing phases.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Run `agent: Main` locally and retain its mutation ownership. If the host cannot honor selected settings, use bounded read-only reasoning assistance without mutation authority; stop if that cannot satisfy selection. Run other phases on the host by default. Dispatch one worker per phase only under [develop](../develop/SKILL.md#dispatch)'s dispatch rule, with the effective brief and the same Goal objective. On Cursor, follow Host Goal for whether that worker creates a Goal. Selected workers execute without redispatch.
3. Dispatch mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Never delegate the whole spec or multiple phases to one worker; workers follow [Worker](#worker).
5. Workers return concise evidence, never a raw validation transcript:

```yaml
status: SUCCESS | FAILURE | BLOCKED
files_changed: [<paths>]
evidence: <command and exit/outcome, observable evidence, or smallest useful excerpt>
repair_hint: <null or new evidence / materially different causal hypothesis>
test_changes: <null or the Test changes record>
```

## Bounded continuation

Only the host continues failed phases: validate the integrated current revision, record new evidence or a materially different causal hypothesis, and amend changed contracts before dispatching at most one fresh repair attempt.

The repair retains phase permissions, mutation ownership, and the current selection, subject to scoped user overrides. Without a user override, a stronger tier requires a specification amendment; broader ownership or a changed decision always requires one. Stop without repair on repeated failure without novelty, attempted criterion weakening, unresolved decisions, permission/policy denial, unavailable credentials/services, exhausted budget, expanded external effects, or user/system interruption. Use only continuation mechanisms callable in the current harness; workers never own continuation.

## Phase verify gate

1. Run every verification entry that names the phase's success criteria against the integrated current revision, or all direct-brief checks; reuse passing evidence under the change-size validation policy.
2. Test change check: when the diff adds, edits, or deletes a test, read the test-file diff and compare it with `test-changes.md` from [Test changes](#test-changes). The check fails when that file is missing, the record has no test design load or no protected behaviors, the diff deletes a test the user did not ask to delete, the record omits a deleted or rewritten test, the record does not name a rewritten test's assertion change, the break check has neither a result nor a reason, or the final check has no result. A passing test command does not replace this check.
3. On failure, follow the bounded continuation contract.
4. After passing, write a compact current-revision `## AGENT LOG` checkpoint. Leave any native Goal active until final verification.
5. Never complete a phase while an applicable command is missing or failing.

## Final verify gate

1. After all phases pass, apply the change-size validation scope against the integrated current revision.
2. For specified work, check the final result against every requirement and success criterion. Record their IDs and evidence in a final `## AGENT LOG` checkpoint. Reuse unaffected evidence; rerun checks invalidated by later writes.
3. Run the test change check against the whole diff.
4. Missing or failing acceptance evidence blocks completion.

For specified work, record:

```markdown
## AGENT LOG
- P1 SUCCESS (revision <n>) — <outcome>; files: <paths>; evidence: <compact result>
```

For front-end work, also apply the [front-end principles](reference.md#front-end-principles).
