---
name: develop
description: "Develop end-to-end changes needing decisions, multiple files/projects, risk management, or delegable phases through research, optional innovation, spec, implementation, validation, independent review, and remediation."
---

# Develop

Own routing, integration, and user communication. Workers run one bounded stage or phase, then return without self-promotion.

## Route

1. `research` only for independent facts.
2. `innovate` only when alternatives add value.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or phase boundaries are unsettled.
4. `implement` from this run's decision-complete spec, or directly for narrow settled work.
5. `review-code` after implementation validation whenever implementation produces changes, including direct work and remediation. Failed or unavailable validation does not waive review.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Continuity

This orchestrator owns transitions, including after `spec`'s internal hard stop:

1. After saving decision-complete `spec_<work-name>.md`, summarize outcome, decisions, phases, touch points, and verification; immediately continue to `implement` without waiting for `approve`, `implement`, or `/implement`.
2. Pause only for an unresolved material product/architecture choice or required user selection. Ask once; never re-ask settled points.
3. Workers remain in their assigned skill and return without self-transition. Select the next stage under the original end-to-end request's authority.

## Worklog

Create one `.ai/worklog/<yyyyMMdd>_<work-name>/`; pass its exact path and `work-name` throughout. Artifacts are optional except when their stage produces:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `trash/`

## Dispatch

1. Main owns decisions, communication, and routing. Researchers supply facts; bounded `spec` workers may reason and author the artifact.
2. The `implement` host materializes each effective brief from the current shared contract and one phase delta, resolving requirements, criteria, verification, boundaries, mutation ownership, and selected tier.
3. Dispatch one implementor per ready phase. Run mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Apply [model selection](model-selection.md) to host reasoning and every worker. Preserve phase instructions and ownership; pass verified author provenance to research and spec workers.
5. Assign one bounded stage/phase per worker, never the whole workflow; wait for all workers before integration.

## Validation

1. Establish a baseline before implementation when practical.
2. Verify phase criteria against the integrated current revision before completion; later writes invalidate affected evidence. Apply `implement`'s final verify gate, including whole-spec acceptance.
3. Run full required validation, select a concrete model under `review-code` and the shared selection rules, and dispatch a fresh independent reviewer with request, effective brief, resolved model/effort, repository instructions, diff, and validation evidence. Validation failures and unavailable review dispatch block completion. The reviewer returns findings directly and creates no review file unless the user explicitly requested one. In Codex, use a fresh reviewer role with this brief, never a shared-agent plugin path; Claude Code/Cursor may use `code-reviewer`.
4. Send every `Open` finding to `implement`. After remediation, rerun full required validation and dispatch a fresh reviewer with the selected review model. Allow at most two fix/re-review rounds. Each round must close at least one finding or add concrete evidence; otherwise stop as blocked.
5. Complete only when full required validation and review of final integrated changes pass, and every actionable finding is `Fixed` or `Not a bug`. Prevention promotion requires the reviewer's fresh confirming review.
6. Leave failed-phase continuation to the active `implement` host's failure-only bounded continuation policy. Review returned changes under step 3 even while implementation remains blocked.
7. Report only the outcome, changed files, validation, actionable review findings, and blockers.
