# Test-design grading

Compare candidate with the verified previous release; only skill provisioning differs. Match fixture, prompt, model, effort, permissions, tools, and output schema. Record release tag/commit, bundle revisions, fixture fingerprint, raw events, changes, and results using the existing evidence convention. Keep this rubric outside agent workspaces.

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
