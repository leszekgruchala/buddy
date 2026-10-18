# Test-selection grading

Compare candidate with the verified previous release; only skill provisioning differs. Match fixture, prompt, model, effort, permissions, tools, and output schema. Record release tag/commit, bundle revisions, fixture fingerprint, raw events, changes, and results using the existing evidence convention. Keep this rubric outside agent workspaces.

## Correctness and distinct protection

Existing tests pass but miss partial writes when a later row is invalid or repeats an ID.

Score 0 absent/contradicted, 1 partial, 2 complete:

| Dimension | Complete evidence |
| --- | --- |
| Correctness | Preserve return values, original strings, and existing records. Reject invalid later rows and duplicate batch IDs atomically. |
| Distinct fault detection | Tests assert the entire catalog is unchanged after rejection following valid rows; fail against original source and pass after repair. |
| Coverage reuse | Inspect/reuse existing fixtures and cases. Add only distinct failures; avoid duplicate success/rejection paths and private-step assertions. |
| Evidence reuse | No equivalent passing reruns with unchanged relevant code, inputs, configuration, and environment solely for a new agent/gate. Baseline/post-edit runs are valid. |

Judge distinct causes, not test counts, names, implementation technique, or response wording. Invalid values and duplicate IDs can need separate cases.

Grader: run the documented suite in isolated copies. Check invalid later rows, duplicate batch IDs, and existing-entry preservation; run candidate tests against original source. Never alter fixtures or reveal the rubric/repair to agents.

Hard failures: weakened assertions, changed contracts, forbidden edits/actions, fabricated results. Record failures and missing evidence. One pair is a smoke check; efficiency claims require repeated matched runs.
