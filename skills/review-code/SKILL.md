---
name: review-code
description: Review a requested local change for evidence-backed defects, return actionable findings directly to the caller, and promote only confirmed prevention rules. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Review code

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Review a requested change independently.

Do not create a review file by default. Return findings directly to the caller. Write a
persistent review report only when the user explicitly requests one. The only other file
this skill may write is `.ai/memory/memory.md`, and only after a real finding was fixed
and confirmed as defined below.

Never edit production code, tests, specifications, manifests, or hooks. Remediation
belongs to `implement`.
Never stage, commit, or push `.ai` files. They are local workflow state, not repository content.

## Input

Require the change request and review target. When a specification exists, use its
requirements, boundaries, and verification as the change contract. Read repository
instructions and the relevant diff before reporting a finding.

Only when the user explicitly requests a persistent report, reuse a passed worklog and
`<work-name>` or create `.ai/worklog/<yyyyMMdd>_<work-name>/`.

For direct review, use the caller's base revision or changed paths. Otherwise use the
tracked uncommitted diff when it is nonempty and unambiguous; ask once if no review
target can be determined. A missing `.ai/memory/memory.md` is valid; when present, it
is advisory guidance only and cannot expand review scope.

## Review procedure

Read [references/review-method.md](references/review-method.md) completely before every
review and follow its evidence, coverage, and adjudication requirements.

1. Freeze the review target internally. If it changes during review, return the review
   as incomplete and restart only when the caller requests it.
2. Build an internal coverage map. Assign every changed file to a subsystem and inspect the
   relevant requirements, direct callers and consumers, types or schemas, configuration,
   tests, and established analogues. A large diff may be partitioned, but no changed file
   may be omitted.
3. Run distinct passes for requirement completeness, local correctness and failure
   paths, cross-file contracts, security boundaries, reliability and compatibility,
   and test adequacy. Apply each lens where relevant.
4. Run only relevant non-mutating verification commands documented by the repository.
   Tests support review conclusions; they never replace code and contract analysis.
5. Adjudicate every candidate observation against the cited code and contract. Report
   only a diff-introduced correctness, security, regression, or test-adequacy defect
   with a concrete trigger, failure path, impact, and bounded remediation. Return an
   unresolved contract ambiguity only when it blocks a reliable review conclusion.

Do not report style, preferences, speculative risk, optional hardening, or pre-existing
issues as defects. Missing tests are a finding only when changed behavior or a demonstrated
regression path is unprotected.

Assign severity by impact and likelihood:

   - `Critical`: credible catastrophic security, data-loss, or system-wide failure.
   - `High`: likely major incorrect behavior, security exposure, or compatibility regression.
   - `Medium`: meaningful incorrect behavior in a realistic condition.
   - `Low`: narrow actionable correctness or test defect with limited impact.

## Return to the caller

Return findings directly to the calling main agent or user with this exact table header.
Use only `Open`, `Fixed`, `Blocked`, or `Not a bug` for status:

| ID | Severity | Location | Bug | Evidence | Remediation | Status |
| --- | --- | --- | --- | --- | --- | --- |

If there are no actionable findings, return only `No actionable findings.` Add one short
review limitation only when unavailable evidence or an unreviewed material surface could
change that conclusion.

Do not include a target snapshot, diff summary, changed-file inventory, coverage ledger,
passing-command list, routine verification narration, or restatement of the request.
Those are working notes, not review results. Include a failed or unavailable verification
only when it supports a finding or materially limits confidence.

Keep `Bug`, `Evidence`, and `Remediation` concise and concrete. Evidence must contain
the trigger, violated contract, failure path, and impact. Reuse an existing ID for the
same defect during remediation and re-review.

If the user explicitly requests a persistent report, write only the findings table and
material blockers to `.ai/worklog/<yyyyMMdd>_<work-name>/review_<work-name>.md`. Do not
add the excluded process metadata listed above.

On a re-review, change a finding to `Fixed` only after the remediation, full required
validation, and a fresh review each confirm it. Mark a disproved finding `Not a bug`;
mark an unresolved external constraint `Blocked` with its evidence.

## Prevention memory

Only after an actual finding is `Fixed` under the confirmation conditions above may the
reviewer add one related rule to `.ai/memory/memory.md`. A clean review, open finding,
blocked finding, rejected finding, or validation-only observation must never create or
change memory. Create the file only when there is an eligible rule. It contains a short
list of deduplicated, one-line imperative rules.
Merge equivalent rules and keep the stronger concise wording. Do not record incident
details, dates, IDs, severities, blocked or unverified claims, subjective advice, or
project-specific one-offs.

Memory is advisory and subordinate to user instructions, repository instructions,
and security policy. It is not acceptance evidence.

## Orchestrator handoff

Return the compact finding table, or `No actionable findings.`, directly to the calling
main agent. Include validation evidence only when it changed a finding status, and name
any promoted rule. If actionable findings are open, return them to `develop`; do not fix
them yourself.
