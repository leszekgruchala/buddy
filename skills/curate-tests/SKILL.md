---
name: curate-tests
description: Curate unit and integration tests for a named target; add tests for uncovered behaviors, refactor existing tests, and remove clearly useless ones without losing coverage. Keep the current request in this skill; route new requests by their own scope.
---

# Curate tests

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

Resolve `.ai/` paths from the user's workspace root (its git root), never from the skill or plugin directory.

## Model selection

Apply [change size](../develop/change-size.md) and [model selection](../develop/model-selection.md); recommend `balanced`.

## Rules

1. Require a target: a file, module, behavior, or change. Ask once if it is ambiguous.
2. Load [test design](test-design.md) before reading the target, and apply it. A direct call also applies section 10, curate existing tests, to the target's tests. When every behavior is covered and nothing needs curation, report that and stop.
3. Change only test code, test support, and the record in rule 6.
4. Do not ask the user before a refactor or removal that section 10 permits. Record it instead.
5. Use documented test commands. Never install dependencies; report and stop if required.
6. Write this record to `.ai/worklog/<yyyyMMdd>_<work-name>/test-changes.md`, or to the run's worklog folder when there is one:

```markdown
Test changes:
- Test design: loaded `curate-tests/test-design.md`
- Protected before: <behaviors the target's tests protected before your edits>
- Protects: <behaviors the tests now protect; every item of Protected before stays>
- Existing tests: <none, or each refactored or removed test, what changed, and its section 10 reason>
- Redundant: <none, or each doubtful test you kept, and why>
- Break check: <for each behavior in Protects: what you broke, the failing test, and the clean restore; or why it is not practical>
- Final check: <abstractions raised or extended, duplicates removed; or no issues>
```

7. When a test exposes a suspected production defect, keep it visible through the project's skip or expected-failure convention with the reason, and report it.

## Output

Report behaviors now protected, tests refactored or removed with the reason, behaviors skipped with the reason, suspected production defects, the record path, and the test command with its result. Return the report and stop; never transition into implementation.
