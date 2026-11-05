---
name: write-tests
description: Write or improve unit and integration tests for existing code; cover distinct behaviors, extend existing test abstractions, and respect module boundaries. Keep the current request in this skill; route new requests by their own scope.
---

# Write tests

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

## Model selection

Apply [change size](../develop/change-size.md) and [model selection](../develop/model-selection.md); recommend `balanced`.

## Rules

1. Require a target: a file, module, behavior, or change. Ask once if it is ambiguous.
2. Load [test design](test-design.md) before reading the target, and apply it. When every behavior is already covered, report that and stop.
3. Change only test code and test support.
4. Do not delete or rewrite existing tests unless the user asked. Report redundant tests instead.
5. Use documented test commands. Never install dependencies; report and stop if required.
6. Where practical, break each protected behavior temporarily to confirm its test fails, then restore the code and confirm it has no diff.
7. When a test exposes a suspected production defect, keep it visible through the project's skip or expected-failure convention with the reason, and report it.

## Output

Report behaviors now protected, abstractions extended, behaviors skipped with the reason, suspected production defects, and the test command with its result. Return the report and stop; never transition into implementation.
