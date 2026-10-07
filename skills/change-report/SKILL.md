---
name: change-report
description: Validate a PR or branch diff and create an HTML change report or walkthrough with before/after behavior, practical impact, and material architecture changes. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Change Report

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Create the shortest HTML explanation of what changed, why, who is affected, and expected consequences or required actions. Include fixes, UX, maintenance, documentation, and tests without requiring architecture changes. The diff and both code versions establish behavior; specs and PR descriptions establish intent. Validate reported changes, not merge readiness or deployment status.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

## Establish the comparison

1. Read repository instructions and inspect the working tree. Resolve the repository, target, and base for the requested PR, branch, or explicit local changes before writing. Ask one concise question if ambiguous; never silently select `main` or include unrelated edits.
2. For a PR, use read-only `gh` commands when available to obtain base/head revisions, description, file list, and patch. Use recorded change revisions for merged PRs, never the current base tip. For a branch, resolve base/head commits and use their merge base as before. Inspect revisions without switching branches; record base, merge base, and head in source labels/evidence.
3. For requested uncommitted work, use the agreed base, distinguish staged/unstaged changes, and explicitly include relevant untracked files. Capture status and content fingerprints for rechecking; label a working-tree snapshot rather than a committed head. Disclose excluded, unavailable, binary, or truncated material when it limits the explanation.
4. Read every changed file and available related spec/worklog. Trace affected entry points, callers, contracts, state, outputs, registrations, configuration, tests, and failure paths through relevant unchanged code. Group by observable feature/process, not filename.

## Validate the explanation

1. Check patch whitespace and each before/after claim against its revision, including material architecture connections. Cite every change; warn with the affected feature and gap when evidence is unavailable. Separate confirmed behavior, inferred purpose, and unknowns; never invent old behavior or claim unmeasured improvements.
2. Run focused documented checks in non-writing modes where available. Another checkout/revision is not target evidence. Never install dependencies, modify product files, rewrite snapshots, deploy, or fix defects. Record checks as passed, failed, or not run with short reasons; label CI evidence with its revision.
3. Show confirmed defects, specification mismatches, and material evidence gaps as warnings before the comparison. Passing checks do not prove correctness. Recheck revisions and local fingerprints after analysis; if changed, mark the report incomplete and do not present it as current.

## Highlight changes that need attention

Assess each feature for diff-, caller-, or contract-supported markers; file count alone does not establish risk. Each marker needs a short reason, specific action, and evidence on its comparison row.

| Marker | Use when | State the next action |
| --- | --- | --- |
| High risk | A concrete failure in changed core behavior could affect security, persistent data, payments, or a critical shared process. | Name the failure path and the targeted check or owner review that addresses it. |
| Breaking change | Existing callers, stored data, configuration, or workflows cannot use the new contract without adaptation. | Name what breaks and the required migration or caller update. |
| Human review | Domain judgment, a critical architecture/trust boundary, or a meaningful user journey needs a person to check it beyond the available automated evidence. | Name the decision or invariant to review, or the smallest hands-on scenario and its expected result. |

Several markers may apply; combine code and hands-on checks under Human review. Separate confirmed breaks from uncertain compatibility, which belongs in a warning or review action. Do not imply review occurred without evidence or invent an approval requirement. Passing tests do not remove supported markers; omit inapplicable ones.

## Keep it short

Explain each change once through purpose and Before / After / Impact rows. State practical consequences, meaningful conditions, limits, and required actions; avoid generic benefits, invented actions, commit logs, file inventories, implementation narration, and repeated summaries. Architecture belongs only when material. For maintenance, docs, or tests, state the supported developer outcome and whether runtime behavior changes. Read [outcome examples](references/examples.md) when architecture is unchanged or impact is unclear.

| Change | Reading budget | Diagram choice |
| --- | --- | --- |
| Small or mechanical | Aim for at most 200 visible words and 1–3 rows | Omit diagrams when the table explains the change. |
| One meaningful process change | Aim for at most 450 visible words and 3–6 rows | Add Before/After diagram tabs when execution flow or wiring changes. |
| Several interacting changes | Aim for at most 700 visible words and 4–8 grouped rows | Show the main affected flow in Before/After tabs; collapse secondary evidence. |

These are ceilings, not quotas; scale by behavioral complexity, not diff size. Preserve material failures and uncertainty even above the budget.

Before authoring diagram data or rendering, read [the report data contract](references/report-data.md) for exact fields, limits, and interaction behavior. Diagrams must share process boundaries, detail level, and unchanged component IDs/positions. Use at most eight nodes per panel and label important arrows with actions/data. Show only code-supported wiring, responsibility, authentication, and state ownership; never depict intended future wiring as implemented or imply a consumer is wired from its endpoint alone. State unknown old flows instead of inventing them. The fixed template supplies Before/After tabs, one visible diagram, and textual/color change states.

For new diagrams, provide the component details needed to explain the change: supported type/role, concise purpose and before/after responsibilities, and links to affected features for inspector attention actions. Omit unsupported metadata and state unknown responsibilities. Keep cards compact; the inspector holds details and current-view connections. Existing inputs may omit component details.

Write short, supported edge `detail` statements for important protocols, authentication, delegation, or state transfers. Execution flow explains who calls whom and what passes without component clicks; aim for 3–5 main connections rather than a dependency inventory. Do not repeat feature benefits, component purpose, or the table. Connection layout never proves total order or sequential parallel branches. The data contract defines flow groups and omission conditions.

## Save and render

1. Reuse the supplied related worklog, otherwise a clear content/name match tied to the feature, PR, or branch in the target repository's `.ai/worklog/`. If absent, create `.ai/worklog/<yyyyMMdd>_<work-name>/` using the user's local date. Resolve `.ai` symlinks without altering them; never save in the installed skill directory. If repository writes are blocked, report the blocker rather than switch repositories.
2. Save and update the same `change-report_<work-name>.html` for related follow-ups. Preserve other diary files. Put inputs in the worklog's `trash/` unless repository instructions give another temporary location.
3. Write evidence-backed JSON and run [the renderer](scripts/render_report.py) with input/output paths. Use [the fixed template](assets/report.html) without changing layout, section order, palette, or typography. Use `--overwrite` only for this workflow's existing report.
4. Open locally when possible. Verify outcome, audience, actions, uncertainty, warnings before comparisons, and labeled Before/After/Impact fields with readable attention actions and no horizontal scrolling on narrow screens. Check labels/arrows, distinct change states, inspector connections, and mouse/keyboard tabs and selections against the data contract. Execution flow must explain actual connections without repeating the table, hide the explorer, and preserve selection when returning to the same version; version switching retains shared components or selects a visible fallback.
5. Require one offline, self-contained file: no CDN, external fonts/scripts, or remote renderer. Use only the bundled interaction script; never insert report content into its code, or raw PR text, code, credentials, or arbitrary HTML/SVG into the template. Redact sensitive evidence.
6. Return the report link and one sentence about the outcome or material validation gap. Do not duplicate the report in chat or upload, post, or publish without an explicit request.
