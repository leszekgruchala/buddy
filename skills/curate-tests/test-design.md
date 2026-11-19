# Test design

Applies to every test you add, change, or review. Keep the fewest tests a careful maintainer would keep. Zero additions is valid.

## 1. Survey first

Before writing a test, read the tests for the changed code, their closest neighbors, and repository test guidance. Find tests that already exercise the behavior, case tables, parameterized tests, contract suites, base classes, helpers, builders, and fixtures. Match the project's framework, layout, naming, and assertion style.

## 2. List behaviors, not inputs

Before writing test code, list the cases. Each names one behavior, its trigger, and the realistic defect it catches.

1. Cover each happy-path outcome, distinct failure cause, edge case that the contract or code handles, and regression being fixed.
2. Inputs that follow the same path to the same kind of outcome are one case. Use one representative input.
3. Keep separate cases for conditions that can regress independently, even with the same result. A deleted account and an expired account both fail login: two cases. Accounts expired by 5 and 10 days: one case.
4. Keep a case only if a realistic defect fails it and no other test.
5. Combine options only when they interact in the code or contract.

## 3. Skip what proves nothing

Do not test:

1. Accessors, plain constructors, data holders, constants, or pass-through delegation with no decision.
2. Language, framework, or library guarantees.
3. Private steps, or log wording and styling that are not contractual.
4. Collection sizes, unless logic depends on size.
5. Inputs that neither the contract nor the code handles, such as `null` where the type excludes it.

## 4. Extend before adding

Take the first option that covers the behavior:

1. Existing test: add nothing.
2. Existing table or case: add one row or assertion.
3. Existing helper, builder, or fixture: extend it, then add the case through it.
4. New test beside related tests, using the shared setup.
5. New shared abstraction, only when several real cases share its shape.

When a signature gains an argument, update the shared helper or table once, with a default that leaves unrelated cases unchanged. Add cases only for behavior the argument creates. Never copy a test to vary one value.

Parameterize only distinct behaviors that share one shape, with a readable name per row; never list equivalent inputs. A case that needs different setup or assertions gets its own test. Keep expected values literal and test bodies free of branches.

## 5. Stay inside the boundary

A test belongs to the module, layer, or bounded context of the code under test. Find the boundary from repository instructions, module layout, build dependencies, and import direction.

1. A test may depend only on what its production code may depend on. Tests of a generic module use neutral inputs and never import or name consumer types, values, or domain examples.
2. Consumer-specific behavior goes in the consumer's tests, which do not retest generic behavior.
3. When a specific bug shows a generic flaw, express the case neutrally in the generic tests.
4. Do not add consumer-specific options to a generic helper or fixture.

## 6. Use the cheapest level that can fail

Unit tests own decisions, branches, and edge cases. Integration tests own what appears only when parts run together: wiring, persistence, serialization, transactions, and contracts between components. Reuse the project's integration harness. Do not repeat the unit cases through an integration test.

## 7. Assert the contract

1. Test through the public interface and assert observable outcomes, using only values the scenario depends on.
2. Take expected values from the contract, not from the code under test.
3. Where practical, prove a regression test fails before the fix and passes after it.
4. When production code contradicts the contract, report the suspected defect; never bend the assertion to pass.

## 8. Keep existing tests

This section applies when a code change edits tests, as in `implement` and `develop`. Sections 2 to 4 select new tests. They never permit you to delete or rewrite an existing test. Only a direct `curate-tests` call may refactor or remove existing tests, under section 10.

1. Do not delete an existing test, or change it beyond what the behavior change forces, unless the user asked. Coverage you believe exists elsewhere is not permission. Report a redundant test and leave it.
2. When a behavior change breaks a test, change only the assertions, calls, and test name that the change forces, and state that scope.
3. Where practical, break a protected behavior temporarily, confirm that its test fails, restore the code, and confirm that the diff matches the diff before the break. `curate-tests` does this for each protected behavior; `implement` does it for at least one new or changed assertion.

## 9. Final check

Read the test diff as a reviewer. Merge or remove each added test that breaks these rules. Then check the added test code as a whole:

1. Consistency: it follows the framework, layout, naming, setup, and assertion patterns of the neighboring tests.
2. Abstraction: raise setup, data, or assertions repeated across added tests into a helper, builder, fixture, or table that follows the project's pattern. When the repetition includes existing tests, report it and leave them (section 8). On a direct `curate-tests` call, refactor them under section 10.
3. Coherence: test names, data, and terms agree with each other and with the production change. No name or description states the old behavior.
4. Duplicates: no added test, helper, or fixture repeats one that exists.

## 10. Curate existing tests

Only a direct `curate-tests` call applies this section, and only to the tests of its target. Do not ask the user; record each refactor and removal with its reason.

1. Before you edit, list the behaviors that the target's tests protect.
2. Refactor: merge tests copied to vary one value into a table, move repeated setup into a helper or fixture that follows the project's pattern, and rename tests whose names state old behavior. Keep what each assertion checks.
3. Remove only clearly useless tests: exact duplicates, tests that assert nothing or only restate a mock, tests of private implementation details that public tests already cover, and tests of code that no longer exists. Never remove the only test of a behavior. When in doubt, keep the test and report it.
4. After you edit, list the protected behaviors again. The list may grow but never shrink.
5. For each behavior on that list, where practical, break it temporarily, confirm that a test fails, restore the code, and confirm that the diff matches the diff before the break. For each removed test, name the remaining test that failed for its behavior.
