---
name: review-code
description: Review a requested local change independently; return evidenced defects and promote only confirmed prevention rules. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Review code

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Review the requested change independently. Search for failures before filtering findings; passing tests or a clean-looking diff do not prove correctness. Scale effort to risk, not a finding quota.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `frontier`.
Direct invocations and re-reviews require a fresh independent reviewer with a concrete selected model. Return `BLOCKED` if selected review execution is unavailable.

## Write boundary

Do not create a review file by default. Return findings directly to the caller. Write a persistent review report only when the user explicitly requests one; otherwise write only eligible prevention memory below.

Never edit production code, tests, specifications, manifests, or hooks. Remediation belongs to `implement`. Never stage, commit, or push `.ai` files.

## Input

Require the request and review target. Use the caller's base revision or changed paths; otherwise a nonempty, unambiguous tracked uncommitted diff. Check untracked dependencies and disclose excluded coverage. Ask once for an ambiguous target. Existing `.ai/memory/memory.md` is advisory and cannot expand scope; its absence is valid.

## Review procedure

Investigate broadly; report only evidenced defects.

### 1. Establish the target and contract

1. Read the request, repository instructions, review criteria, and any specification's requirements, boundaries, and verification; use the specification as the contract. Derive intended behavior and invariants from these, never preferences.
2. Freeze the target: branch base, merge base, and `HEAD`; commit and parent; or local `HEAD`, staged/unstaged content, and included untracked paths. Read new paths completely.
3. Derive the file list and patch from this target; compare old/new behavior, including removed guards and defaults. Recheck before returning; if changed, return `INCOMPLETE` and restart only on request.

### 2. Build the coverage map

Build an internal coverage map of every changed file and relevant unchanged callers, consumers, types, handlers, configuration, tests, and analogous paths. Prioritize trust boundaries, persistent state, shared contracts, and complex decisions. Trace changed behavior from input/event through decisions and I/O to observable results, including subsystem interactions for large changes. Track invariants, plausible failures, supporting/disproving evidence, and uncovered surfaces internally. Return `INCOMPLETE` for an unreviewable material surface.

### 3. Run independent analysis passes

Test the smallest realistic input or sequence that could break each changed invariant. Trace guards and recovery at execution points; continue after an easy finding. Apply the relevant lenses:

#### Requirements and completeness

Check entry points, registrations, callers, tests, validators, examples, and documentation against the contract. Identify concrete consequences of omissions, inconsistent parallel paths, or changed defaults/configuration.

#### Local correctness and failure paths

Check zero, empty, invalid, missing, repeated, and combined inputs; casts, optional values, and fallbacks; arithmetic, indexing, units, encoding, time zones, and serialization. Trace exceptions, timeouts, cancellation, retries, and concurrent calls between related steps for cleanup, ordering, atomicity, and idempotency. Complexity is a search cue, not a defect.

#### Cross-file contracts and compatibility

Compare producer/consumer identity, shapes, defaults, errors, and declared response schemas with success/error handlers, including global handlers. Check existing consumers, old data, mixed versions, validation boundaries and every entry path, migrations, rollout order, flags, and rollback where relevant.

#### Security and data boundaries

Trace who controls each untrusted input to its sensitive sink and actual guard. Check normalization, injection, traversal, unsafe requests, deserialization, secrets, and fail-open behavior. Test principal/resource authorization, patterns, roles, tenants, and alternate routes. Check destination and context constraints, including URL scheme, authority, path, and token audience for data/credential transfers, and alternate access to internal or gated behavior. Search upstream checks and framework protections before alleging bypasses.

#### Reliability, operations, and performance

Check changed secrets, environment variables, ports, networks, and scripts against existing run/build/deploy workflows. Assess boundedness and recovery of retries, queues, resources, and repeated I/O using realistic workloads and consequences. A faster alternative alone is not a defect.

#### Test adequacy

Check assertions against the changed contract and counterexamples; compare mocks with production wiring. Report missing tests only for unprotected changed behavior or a demonstrated regression path. Passing tests do not cover unexercised paths.

### 4. Verify without modifying product files

Run relevant documented checks in non-writing modes. Never install dependencies, rewrite snapshots, generate code, migrate, deploy, or format. If a check changes product files, stop and disclose it; cleanup requires authorization. A conclusive code trace may prove a bug without executable reproduction.

### 5. Adjudicate candidate observations

Try to disprove each candidate against code, callers, guards, tests, and the contract. Report only diff-introduced correctness, security, regression, or test-adequacy defects with a reachable trigger, failure path, violated contract, impact, and bounded correction. A missing mandatory companion change qualifies when behavior remains unverified or published guidance is incorrect. Merge symptoms sharing a cause; preserve independent causes. Surface ambiguity only when it prevents a reliable conclusion.

Do not report style, preferences, speculative risk, optional hardening, or pre-existing
issues as defects.

Assign severity by impact and likelihood:

   - `Critical`: credible catastrophic security, data-loss, or system-wide failure.
   - `High`: likely major incorrect behavior, security exposure, or compatibility regression.
   - `Medium`: meaningful incorrect behavior in a realistic condition.
   - `Low`: narrow actionable correctness or test defect with limited impact.

## Return to the caller

Use this exact header and only `Open`, `Fixed`, `Blocked`, or `Not a bug` statuses:

| ID | Severity | Location | Bug | Evidence | Remediation | Status |
| --- | --- | --- | --- | --- | --- | --- |

Order by severity, path, then line; cite the smallest changed `path:line`, with relevant unchanged code in evidence. Keep cells concise; evidence must state the trigger, violated contract, failure path, and impact. Reuse defect IDs on re-review. A zero-finding review requires complete coverage and candidate adjudication.

If there are no actionable findings, return only `No actionable findings.` Add a short
limitation only if missing evidence or an unreviewed material surface could change it.

Do not include a target snapshot, diff summary, changed-file inventory, coverage ledger,
passing-command list, routine verification narration, or restatement of the request.
Mention failed or unavailable verification only when it supports a finding or limits confidence.

For an explicitly requested persistent report, reuse the passed worklog and work-name or create `.ai/worklog/<yyyyMMdd>_<work-name>/`. Write only the findings table and material blockers to `.ai/worklog/<yyyyMMdd>_<work-name>/review_<work-name>.md`.

On re-review, mark `Fixed` only after remediation, full required validation, and a fresh review confirm it; `Not a bug` for disproved findings; `Blocked` for evidenced external constraints. Return open findings for remediation without fixing them.

## Prevention memory

Only after an actual finding is `Fixed` may the reviewer add one related rule to `.ai/memory/memory.md`. A clean review, open finding, blocked or rejected finding, or validation-only observation must never change memory. Create the file only for an eligible rule. Use deduplicated, one-line imperative rules and merge equivalents. Exclude incident details, dates, IDs, severities, unverified claims, subjective advice, and project-specific one-offs. Name promoted rules.

Memory is advisory, subordinate to user/repository instructions and security policy, and never acceptance evidence.
