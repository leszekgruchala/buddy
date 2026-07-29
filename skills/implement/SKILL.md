---
name: implement
description: Implement or fix decision-complete code directly, or execute an approved spec phase with verification. Use for build/fix requests or an approved spec path supplied as FILE; route unresolved product or architecture decisions to spec.
---

# Implement

Implement only the authorized request/spec. Do not activate another Buddy skill, expand scope, or continue into unrelated work.

## Input modes

- **Specified:** `FILE=<path>` is an approved `spec_<work-name>.md`; resume its TODOs and `## AGENT LOG`.
- **Direct:** without a file, form a short working brief: outcome, exclusions, affected contracts, risks, and exact verification. Do not create a spec for narrow decision-complete work.
- If a material product/architecture decision is unresolved, stop and require `spec`.

## Engineering rules

1. Change only authorized paths; remove only change-created orphans.
2. Before editing, load the [engineering contract](reference.md#engineering-contract) and only the applicable overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
3. Use current primary library/API/SDK/CLI documentation. Find references before changing public signatures.
4. Preserve comments unless correcting them.
5. Reuse the spec worklog. For direct work, create `.ai/worklog/<yyyyMMdd>_<work-name>/trash/` only if scratch files are needed.

## Spec execution

1. Walk phases in dependency order; skip phases already marked SUCCESS.
2. Run `agent: Main` locally; otherwise dispatch one worker for one phase, giving its brief, `files_touched`, success criteria, and out-of-scope boundary.
3. Dispatch mutually declared `parallel_with` phases together only after confirming different projects, disjoint files, no dependency, and no shared mutable state.
4. Resolve model and reasoning overrides through [model-policy](../model-policy/SKILL.md); omit unsupported values.
5. Never delegate the whole spec or multiple phases to one worker. Workers never ask the user and return:

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
