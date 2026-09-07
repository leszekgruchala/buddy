---
name: implement
description: Implement or fix decision-complete code directly, or execute an approved spec phase with verification. Use for build/fix requests or an approved spec path; route unresolved product or architecture decisions to spec. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Implement

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Implement only the authorized request/spec. Do not expand scope or continue into unrelated work.

## Input modes

- **Specified:** the request references an approved `spec_<work-name>.md` path; resume its TODOs and `## AGENT LOG`.
- **Direct:** without an approved spec path, form a short working brief: outcome, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.
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

Only the host manages the Goal and retains its native identifiers. Immediately before local phase execution or worker dispatch, mark the corresponding native item in progress when the schema supports item status; mark multiple items in progress only for phases already approved to run in parallel. Mark a phase/item complete only after its success criteria pass and only when the native schema supports item-level completion; otherwise preserve its state without inventing an update. Complete the whole Goal only after the verify gate passes and required spec records are updated. If a required native update fails, stop before the next edit or dispatch and report the UI-sync blocker. If work stops incomplete, do not report or mark the Goal complete; use a supported non-complete state or report the fallback as incomplete.

## Engineering rules

1. Change only authorized paths; remove only change-created orphans.
2. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
3. Use current primary library/API/SDK/CLI documentation. Find references before changing public signatures.
4. Preserve comments unless correcting them.
5. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only if scratch files are needed.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Run `agent: Main` locally; otherwise dispatch one worker for one phase, giving its Goal gate status, brief, `files_touched`, success criteria, and out-of-scope boundary.
3. Dispatch mutually declared `parallel_with` phases together only after confirming different projects, disjoint files, no dependency, and no shared mutable state.
4. Resolve model and reasoning overrides through [model-policy](../model-policy/SKILL.md); omit unsupported values.
5. Never delegate the whole spec or multiple phases to one worker. Workers never manage the host Goal, never ask the user, and return:

```yaml
status: SUCCESS | FAILURE | BLOCKED
files_changed: [<paths>]
log:
  - <outcome>
blockers: []
```

## Verify gate

1. Run every phase success criterion, or all direct-brief compile, lint, and test commands.
2. Retry a failure once; after the second failure, record FAILURE and stop.
3. Only after verification passes, mark TODOs and `## AGENT LOG`.
4. Never complete work while an applicable command is missing or failing.

For specified work, record:

```markdown
## AGENT LOG
- Phase 1 SUCCESS — <outcome>; files: <paths>
```

For front-end work, also apply the [front-end principles](reference.md#front-end-principles).
