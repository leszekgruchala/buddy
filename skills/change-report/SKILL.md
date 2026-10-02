---
name: change-report
description: Validate a pull request or branch diff and create a concise HTML explanation of its purpose, practical impact, and material architecture changes with before/after comparisons. Use for visual change reports and change walkthroughs. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Change Report

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Create the shortest report that explains what changed, why, who is affected, and what they can expect or need to do. Cover fixes, user experience, maintenance, documentation, and tests even when architecture stays the same. Use the actual diff and both versions of the code as evidence. A specification or PR description explains intent; it does not prove implementation. This workflow validates the reported change, not merge readiness or deployment status.

## Establish the comparison

1. Read repository instructions and inspect the working tree. Accept a PR, a branch with a base, or explicit local changes. Resolve the repository and comparison before writing. If the target or base cannot be established unambiguously, ask one concise question; do not silently select `main` or include unrelated local edits.
2. For a PR, use read-only `gh` commands when available to get its base and head revisions, description, file list, and patch. For a branch, resolve the base and head to commit IDs and use their merge base as the before revision. Inspect files at those revisions without switching branches. Record the base, merge base, and head in the source label/evidence. If a PR is merged, use its recorded change revisions, not the current base tip.
3. For explicitly requested uncommitted work, compare with the agreed base, distinguish staged and unstaged changes, and include relevant untracked files explicitly. Capture the status and a content fingerprint for the included files so the snapshot can be rechecked. Record this as a working-tree snapshot rather than a committed head. Report excluded, unavailable, binary, or truncated material when it limits the explanation.
4. Read every changed file and trace affected entry points, callers, contracts, state, and outputs through the relevant unchanged code. Group by observable feature or process, not by filename. Read the related specification/worklog when available. Check registrations, configuration, tests, and failure paths that can contradict the intended behavior.

## Validate the explanation

1. Check the patch for whitespace errors and verify each reported before/after statement against its respective revision. Trace affected behavior and any material architecture connections on both sides. Cite the relevant source for each change; if evidence is unavailable, name that feature and the gap in a warning. Distinguish confirmed behavior, inferred purpose, and unknowns; do not invent missing old behavior or claim unmeasured improvements.
2. Run focused, repository-documented checks in non-writing modes where available. Tests of another checkout or revision are not evidence for this target. Do not install dependencies, modify product files, rewrite snapshots, deploy, or fix defects as part of the report. Record each check as passed, failed, or not run with a short reason. Existing CI results may be cited with their revision; label them as CI evidence.
3. Put confirmed defects, specification mismatches, and material evidence gaps in visible warnings before the comparison. Passing checks do not prove correctness. Recheck the target revisions and local snapshot after analysis; if either changed, mark the report incomplete and do not present it as current.

## Highlight changes that need attention

Assess each feature for the following markers. Add only markers supported by the diff, affected callers, or repository contracts; do not flag every change or assign risk from file count alone.

| Marker | Use when | State the next action |
| --- | --- | --- |
| High risk | A concrete failure in changed core behavior could affect security, persistent data, payments, or a critical shared process. | Name the failure path and the targeted check or owner review that addresses it. |
| Breaking change | Existing callers, stored data, configuration, or workflows cannot use the new contract without adaptation. | Name what breaks and the required migration or caller update. |
| Human review | Domain judgment, a critical architecture/trust boundary, or a meaningful user journey needs a person to check it beyond the available automated evidence. | Name the decision or invariant to review, or the smallest hands-on scenario and its expected result. |

Put these markers directly on the affected comparison row, with a short reason, a specific action, and source evidence. Several markers may apply to one feature; combine code review and hands-on checks under one Human review marker. Keep confirmed breaking changes separate from uncertain compatibility risks; put uncertainty in a warning or review action. Do not imply that human review happened unless there is evidence, or turn a recommendation into an invented approval requirement. Passing tests do not remove a supported marker. Omit markers when none applies.

## Keep it short

Use purpose and the comparison table to explain the changes once. Each row states the old behavior, new behavior, and practical consequence for affected people or callers. Name meaningful conditions, limits, and required actions when they matter; do not add generic benefits or a required action where none exists. Mention architecture only when it helps explain a material effect. For maintenance, documentation, or test-only changes, state the supported developer outcome and be explicit when runtime behavior does not change. Avoid commit logs, file inventories, implementation narration, and repeated summaries. Read [the short outcome examples](references/examples.md) when a change has no architectural effect or its impact is unclear.

| Change | Reading budget | Diagram choice |
| --- | --- | --- |
| Small or mechanical | Aim for at most 200 visible words and 1–3 rows | Omit diagrams when the table explains the change. |
| One meaningful process change | Aim for at most 450 visible words and 3–6 rows | Add Before/After diagram tabs when execution flow or wiring changes. |
| Several interacting changes | Aim for at most 700 visible words and 4–8 grouped rows | Show the main affected flow in Before/After tabs; collapse secondary evidence. |

These are ceilings to aim below, not quotas. Scale by behavioral complexity, not lines changed. Preserve material failures and uncertainty even if the reading budget must grow. A large mechanical diff can still have a tiny report.

When diagrams help, show them in Before/After tabs with After selected initially and only one diagram visible at a time. Keep the same process boundary, level of detail, and matching component IDs and positions across both tabs. Use at most eight nodes per panel and label important arrows with the action or data passed. Use `unchanged`, `added`, `changed`, or `removed` states for nodes and edges. The template distinguishes these states with gray, teal, amber, and red, and adds status words to cards so color is not the only signal. Highlight changes in wiring, responsibility, authentication, or state ownership. Do not draw a desired future path as implemented or imply a consumer is wired when only its endpoint was added. If the old flow is unknown, state that gap instead of inventing a diagram.

For each diagram component, record its code-supported type and short role, such as API, worker, queue, datastore, or external system. Keep cards compact: a name, type/role, and change status. Put purpose and before/after responsibilities in the selectable inspector, using one short sentence each where possible. Link components to their affected comparison features so attention actions appear in the inspector. The inspector derives incoming/outgoing connections from the current diagram. Omit unsupported metadata and state unknown responsibilities explicitly. Component details are optional for existing report inputs; when authoring a new diagram, provide them for the components needed to explain the change.

Use the Execution flow tab to explain wiring without component clicks: who calls whom and what data or action passes between them. The renderer compares diagram connections, leading with Added, Changed, and Removed groups, then showing Unchanged context once. Write short, code-supported edge `detail` statements for important protocols, authentication, delegation, or state transfers; these appear in the flow and inspector without making arrow labels longer. Show the main connected steps, aiming for 3–5 connections rather than a complete dependency inventory. Do not repeat feature benefits, component purpose, or the comparison table in this view. Diagram order alone does not prove a total execution order or that parallel branches run sequentially. The renderer omits the tab when connections are identical and have no additional detail, or both diagrams contain no connections.

## Save and render

1. Reuse the user-provided related worklog first. Otherwise search the target repository's `.ai/worklog/` for a spec/research diary tied to the feature, PR, or branch; use content as well as its name. Reuse only a clear match. If none exists, create `.ai/worklog/<yyyyMMdd>_<work-name>/` in that repository using the user's local date. Resolve existing `.ai` symlinks without changing them. Do not put a new report in the installed skill directory.
2. Save `change-report_<work-name>.html` there. Update that same report for related follow-ups. Put generation inputs in the worklog's `trash/` unless repository instructions specify another temporary location. Preserve other diary files. If repository writes are unavailable, report the blocker rather than silently choosing another repository.
3. Read [the report data contract](references/report-data.md), write the evidence-backed JSON input, then run [the renderer](scripts/render_report.py) with the input and output paths. It uses [the fixed template](assets/report.html). Keep its layout, section order, palette, and typography unchanged. Use `--overwrite` only to update this workflow's existing report.
4. Open the resulting HTML locally when possible. Check that readers can identify the outcome, affected people/callers, and any required action or uncertainty. On narrow screens, Before, After, and Impact must have visible labels and fit without horizontal scrolling; attention actions must remain readable. Check that warnings precede the comparison, then check diagram labels/arrows, tab switching and component selection by mouse and keyboard, distinct change states, and inspector connections. Check that Execution flow explains actual connections without repeating the feature table, hides the explorer, and preserves its selection when returning to the same version. Switching versions retains the selection when that component exists in both diagrams and chooses a visible component otherwise. The report must be one self-contained file that works offline; no CDN, external font, external script, or remote diagram renderer. Use only the template's bundled interaction script, with no report content inserted into its code. Never insert raw PR text, code, credentials, or arbitrary HTML/SVG into the template. Redact sensitive values from evidence.
5. Return the report link and one sentence about the outcome or a material validation gap. Do not repeat the report in chat or upload, post, or publish it without an explicit request.
