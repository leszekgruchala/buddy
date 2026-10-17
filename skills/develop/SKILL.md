---
name: develop
description: "Develop end-to-end changes needing decisions, multiple files/projects, risk management, or delegable phases through research, optional innovation, spec, implementation, validation, independent review, and remediation."
---

# Develop

Own routing, integration, and user communication. Workers run one bounded stage or phase, then return without self-promotion.

## Route

First apply [change size](change-size.md). Record the size and honor request-specific step overrides before selecting stages.

1. `research` only for independent facts.
2. `innovate` only when alternatives add value.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or phase boundaries are unsettled.
4. `implement` from this run's decision-complete spec, or directly for narrow settled work.
5. `review-code` after implementation validation only when the size policy or user requires it. Failed or unavailable validation does not waive required review.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Continuity

This orchestrator owns transitions, including after `spec`'s internal hard stop:

1. After saving decision-complete `spec_<work-name>.md`, summarize outcome, decisions, phases, touch points, and verification; immediately continue to `implement` without waiting for `approve`, `implement`, or `/implement`.
2. Pause only for an unresolved material product/architecture choice or required user selection. Ask once; never re-ask settled points.
3. Workers remain in their assigned skill and return without self-transition. Select the next stage under the current unfinished request's authority. After completion, route each new request by its own size.

## Worklog

For stages that need artifacts, create one `.ai/worklog/<yyyyMMdd>_<work-name>/`; pass its exact path and `work-name` throughout. Artifacts are optional except when their stage produces:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `trash/`

## Dispatch

1. Main owns decisions, communication, and routing. Researchers supply facts; bounded `spec` workers may reason and author the artifact.
2. The `implement` host materializes each effective brief from the current shared contract and one phase delta, resolving requirements, criteria, verification, boundaries, mutation ownership, and selected tier.
3. Keep short phases on the host. When the size policy permits delegation, dispatch one implementor per ready phase. Run mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Apply [model selection](model-selection.md) to host reasoning and every worker. Preserve phase instructions and ownership; pass verified author provenance to research and spec workers.
5. Assign one bounded stage/phase per worker, never the whole workflow; wait for all workers before integration.
6. Include the phase outcome in that same dispatch brief. On Cursor, try once before the launch to create one native Goal for that outcome and say so in the brief; if the call cannot be made or is refused, the same brief tells the worker to create one Goal for its own agent. Codex and Claude put that outcome in the one parent checklist in the same brief and do not ask for a native Goal tool. Do not launch without the outcome text, do not respawn a worker because a Goal-gate phrase is missing, and do not interrupt a worker that has already started.

## Validation

1. Establish a baseline before implementation when practical.
2. Verify phase criteria against the integrated current revision before completion; later writes invalidate affected evidence. Apply `implement`'s final verify gate, including whole-spec acceptance.
3. Run validation required by the size policy and repository. When review is required, select a model under `review-code` and dispatch a fresh independent reviewer with request, size, effective brief, resolved model/effort, repository instructions, diff, and validation evidence. The reviewer returns findings directly and creates no review file unless the user explicitly requested one. In Codex, use a fresh reviewer role, never a shared-agent plugin path; Claude Code/Cursor may use `code-reviewer`.
4. Fix every `Open` finding through `implement`, using the host for short fixes. Rerun affected validation. Follow the size policy for required re-review, optional review consent, and at most two fix/re-review rounds. Each round must close at least one finding or add concrete evidence; otherwise stop as blocked.
5. Complete only when required validation and review pass, and every actionable finding is fixed or disproved. The host may confirm Low-only fixes for small work; label them host-verified. Prevention promotion requires the reviewer's fresh confirming review.
6. Leave failed-phase continuation to the active `implement` host's failure-only bounded continuation policy. Apply the size policy to review of returned changes even while implementation remains blocked.
7. Report only the outcome, changed files, validation, actionable review findings, and blockers.
