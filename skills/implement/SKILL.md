---
name: implement
description: Implement a narrow decision-complete request directly or execute one approved spec phase with verification. Use when the user asks to build or fix code, or supplies a spec path as FILE; route unresolved product or architectural decisions to plan rather than guessing.
---

# Implement

Implement only the authorized request or spec. Do not activate another Buddy skill, expand scope, or continue into unrelated work.

## Input modes

1. **Specified:** `FILE=<path>` points to an approved `spec_<work-name>.md`; resume from its TODOs and `## AGENT LOG`.
2. **Direct:** no file is supplied; form a short working-context brief with outcome, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.

If a material product or architectural decision is unresolved, stop and require `plan`.

## Engineering rules

1. Change only authorized paths and remove only orphans created by the change.
2. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable language overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
3. Use current primary documentation for libraries, APIs, SDKs, and CLIs.
4. Find references before changing public signatures.
5. Preserve existing comments unless correcting them.
6. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only when scratch files are needed.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Execute `agent: Main` locally. Otherwise dispatch one worker for one phase with its brief, `files_touched`, success criteria, and out-of-scope boundary.
3. Dispatch mutually declared `parallel_with` phases together only after confirming different projects, disjoint files, no dependency, and no shared mutable state.
4. Resolve model and reasoning overrides through [model-policy](../model-policy/SKILL.md); omit unsupported values.
5. Never delegate the whole spec or multiple phases to one worker.
6. Workers never ask the user and return:

```yaml
status: SUCCESS | FAILURE | BLOCKED
files_changed: [<paths>]
log:
  - <outcome>
blockers: []
```

## Verify gate

1. Run every phase success criterion, or every direct-brief compile, lint, and test command.
2. Retry a failure once. After the second failure, record FAILURE and stop.
3. Mark TODOs and `## AGENT LOG` only after verification passes.
4. Never mark work complete while an applicable command is missing or failing.

For specified execution, record:

```markdown
## AGENT LOG
- Phase 1 SUCCESS — <outcome>; files: <paths>
```

For front-end work, also apply [front-end principles](reference.md#front-end-principles).
