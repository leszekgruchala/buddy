---
name: review-code
description: Review a requested local change for evidence-backed defects, record findings in its worklog, and promote only confirmed prevention rules. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Review code

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Review a requested change independently.

The reviewer may write only the selected review worklog and `.ai/memory/memory.md`.
Never edit production code, tests, specifications, manifests, or hooks. Remediation belongs to
`implement`.
Never stage, commit, or push `.ai` files. They are local workflow state, not repository content.

## Input

Require the change request and review target. Reuse a passed worklog and
`<work-name>`; otherwise create `.ai/worklog/<yyyyMMdd>_<work-name>/`. When a
specification exists, use its requirements, boundaries, and verification as the
change contract. Read repository instructions and the relevant diff before reporting
a finding.

For direct review, use the caller's base revision or changed paths. Otherwise use the
tracked uncommitted diff when it is nonempty and unambiguous; ask once if no review
target can be determined. A missing `.ai/memory/memory.md` is valid; when present, it
is advisory guidance only and cannot expand review scope.

## Review procedure

Read [references/review-method.md](references/review-method.md) completely before every
review and follow its evidence, coverage, and adjudication requirements.

1. Freeze the review target. Record the target kind, `HEAD`, base or changed paths,
   and the changed-file inventory. If the target changes during review, mark the review
   incomplete and restart only when the caller requests it.
2. Build a coverage map. Assign every changed file to a subsystem and inspect the
   relevant requirements, direct callers and consumers, types or schemas, configuration,
   tests, and established analogues. A large diff may be partitioned, but no changed file
   may be omitted.
3. Run distinct passes for requirement completeness, local correctness and failure
   paths, cross-file contracts, security boundaries, reliability and compatibility,
   and test adequacy. Apply each lens where relevant and record skipped material surfaces.
4. Run only relevant non-mutating verification commands documented by the repository.
   Tests support review conclusions; they never replace code and contract analysis.
5. Adjudicate every candidate observation against the cited code and contract. Report
   only a diff-introduced correctness, security, regression, or test-adequacy defect
   with a concrete trigger, failure path, impact, and bounded remediation. Put unresolved
   contract ambiguity in `Uncertainties`, not in the findings table.

Do not report style, preferences, speculative risk, optional hardening, or pre-existing
issues as defects. Missing tests are a finding only when changed behavior or a demonstrated
regression path is unprotected.

Assign severity by impact and likelihood:

   - `Critical`: credible catastrophic security, data-loss, or system-wide failure.
   - `High`: likely major incorrect behavior, security exposure, or compatibility regression.
   - `Medium`: meaningful incorrect behavior in a realistic condition.
   - `Low`: narrow actionable correctness or test defect with limited impact.

## Review artifact

Create or update `.ai/worklog/<yyyyMMdd>_<work-name>/review_<work-name>.md` with:

1. `Status: COMPLETE` or `Status: INCOMPLETE`, plus the target snapshot.
2. `## Findings` with this exact table header. Use only `Open`, `Fixed`, `Blocked`,
   or `Not a bug` for status:

   | ID | Severity | Location | Bug | Evidence | Remediation | Status |
   | --- | --- | --- | --- | --- | --- | --- |

3. `## Uncertainties` for ambiguous requirements or missing evidence that prevents a
   defect claim.
4. `## Coverage` listing every changed file, relevant supporting surfaces inspected,
   and any material surface not reviewed.
5. `## Verification` with each command, result, and scope, or why it was not run.
6. `## Limits` with excluded or unavailable evidence, or `None`.

A clean review has the findings header and no finding rows. It may be `COMPLETE` only
when every changed file and material supporting surface was reviewed, candidate
observations were adjudicated, and verification limits are explicit. Reuse an existing
ID for the same defect, append new findings, and update resolved rows instead of removing
them. Keep `Bug` and `Remediation` concise and concrete; keep the trigger, violated
contract, failure path, and impact in `Evidence`.

On a re-review, change a finding to `Fixed` only after the remediation, full required
validation, and a fresh review each confirm it. Mark a disproved finding `Not a bug`;
mark an unresolved external constraint `Blocked` with its evidence.

## Prevention memory

After a finding is `Fixed` under the confirmation conditions above, the reviewer may
add one related rule to `.ai/memory/memory.md`. Create the file only when there is an
eligible rule. It contains a short list of deduplicated, one-line imperative rules.
Merge equivalent rules and keep the stronger concise wording. Do not record incident
details, dates, IDs, severities, blocked or unverified claims, subjective advice, or
project-specific one-offs.

Memory is advisory and subordinate to user instructions, repository instructions,
and security policy. It is not acceptance evidence.

## Orchestrator handoff

Return the review artifact path, finding IDs and statuses, validation evidence used
for status changes, and any promoted rule. If actionable findings are open, return
them to `develop`; do not fix them yourself.
