# Change-report Outcome Grading

These five cases test human understanding, including changes with no architecture effect. Use the existing paired evaluation evidence contract; this case set does not add a runner. Copy each fixture workspace with no materialization operations. Execute its identical prompt and runtime settings for both conditions. For this initial skill evaluation, provision Buddy only for the candidate and use no Buddy for the baseline. For later releases, use the previous released version as baseline. Record model, effort, permissions, tools, fixture fingerprints, output schema, and provisioning in metadata.

A human grades both rendered reports against the same case requirement, without assuming that use of a specific layout proves clarity. At 390px and desktop width, read the visible report first and expand evidence only to verify a claim. Record each score and a brief supporting quote or observation in grading.json.

| Dimension | 2: complete and specific | 1: partial | 0: absent or contradicted |
| --- | --- | --- | --- |
| Practical outcome | Correctly explains the observable change and its meaningful condition or limitation. | Correct change with vague consequence or missing condition. | Wrong outcome, implementation-only narration, or unsupported benefit. |
| Affected readers | Names the affected users, callers, integrators, or maintainers and bounds the effect. | Readers must infer who is affected. | Wrong or unsupported audience, or no identifiable audience. |
| Required action | States the specific action when required; does not invent one otherwise. | Action is vague or optional review is presented unclearly. | Misses the CSV migration, invents a required gate, or claims review occurred. |
| Evidence and uncertainty | Cites source snapshots and exposes unavailable history/callers before the comparison. | Evidence or caveat exists but is incomplete or hard to find. | Confident unsupported compatibility claim, fake revisions, or hidden/absent material gap. |
| Brevity and diagram choice | Short comparison conveys the outcome once; omits gratuitous diagrams. Impact/actions fit at 390px without horizontal scrolling. | Some repetition or unnecessary detail; readable with effort. | Outcome/actions are obscured, duplicated extensively, or displaced by irrelevant architecture. |

Use the case-specific requirement in evals.json for the expected facts. The incomplete-evidence case must not infer previous behavior. The maintenance case must distinguish guide/test improvements from a runtime change. None of these fixtures requires a diagram because no changed wiring is demonstrated.

Verify that only allowed report/input paths changed, the report is self-contained, and source files remain intact. Treat source edits, secret disclosure, forbidden external actions, or fabricated results as hard failures regardless of semantic scores. Record not-run validation honestly. A smoke pass is not evidence that the skill improves quality generally; model evaluations remain pending until both conditions have actually run.
