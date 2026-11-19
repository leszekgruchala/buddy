# Test-design grading

Compare candidate with the verified previous release; only skill provisioning differs. The two curation cases are new, so their baseline is no Buddy until a release ships them. Match fixture, prompt, model, effort, permissions, tools, and output schema. Record release tag/commit, bundle revisions, fixture fingerprint, raw events, changes, and results using the existing evidence convention. Keep this rubric outside agent workspaces.

## Distinct behaviors

The new argument creates three generic behaviors: the default accepts any prefix, a listed prefix is accepted after normalization, and an unlisted prefix is rejected. The existing `ACCEPTED` and `REJECTED` tables and the `normalize` helper can hold them. The existing billing tests already cover `invoice_code`.

Score 0 absent/contradicted, 1 partial, 2 complete:

| Dimension | Complete evidence |
| --- | --- |
| Correctness | Argument behaves as requested, existing behavior is preserved, and `invoice_code` uses the argument. |
| Fault detection | Added tests fail for each mutant below. |
| Abstraction reuse | The `normalize` helper and the case tables are extended; existing rows keep their meaning. No test is copied to vary one value. |
| Case economy | At most one added case per distinct behavior. No extra cases for several prefixes on the same path, several rejected values, or argument combinations that do not interact. |
| Boundary respect | `tests/core` names no invoice concept such as `INV-` or `invoice`, and imports nothing from `src/billing`. Generic prefix behavior is not retested in `tests/billing`. |

Judge distinct behaviors, not test counts, names, or response wording. A separate test is acceptable when the table cannot express the case.

Grader: run the documented suite in isolated copies, then run the candidate tests against each mutant of `normalize_code`: the prefix check is removed; the check runs before normalization; an empty `allowed_prefixes` rejects every code. Never alter fixtures or reveal the rubric to agents.

Hard failures: weakened assertions, changed contracts, forbidden edits/actions, fabricated results. Record failures and missing evidence. One pair is a smoke check; quality claims require repeated matched runs.

## Curation cases

Both cases ask for a direct curation of one test file. Score each metric 0 absent/contradicted, 1 partial, 2 complete:

| Dimension | Complete evidence |
| --- | --- |
| Coverage kept | The curated tests fail for every mutant of the case. `src` and `CONTRACT.md` are unchanged and the suite passes. |
| Removal precision | Every removed test is one the case lists as removable, and no other behavior lost its test. |
| Refactor quality | Copied tests are merged into a table or loop with a readable name per row, following the file's style. No assertion is weakened. |
| Record | Each removal and refactor is recorded with its reason, with the protected behaviors before and after. |

Grader: run the documented suite on the result, then run the curated tests against each mutant below in isolated copies.

### Remove a useless test

`test_applies_discount_again` is an exact copy of `test_applies_discount`. `test_uses_round_helper` checks a value the test gave its own mock and a private call that `test_rounds_to_cents` covers. Both must go. Mutants: rounding removed; negative price accepted; percent over 100 accepted; the discount added instead of subtracted.

### Keep the only test of a behavior

`test_parses_three`, `test_parses_seven`, and `test_parses_twelve` are copies that vary one value, and `test_parses_twelve_copy` is an exact duplicate. Merging the copies and removing the duplicate is expected. `test_parses_large_copy` looks like another copy, but it is the only test that 999 is accepted. Its case must stay, as a test or a table row. Mutants: 999 rejected (`>=` limit); zero accepted; values over 999 accepted; blank text returns 0.

Hard failures: a removed only test of a behavior, weakened assertions, edits outside `tests` and `.ai/worklog`, fabricated results.
