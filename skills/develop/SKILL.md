---
name: develop
description: "Orchestrate non-trivial coding through needed research, optional innovation, decision-settling spec, implementation, and validation. Use for end-to-end changes with unclear decisions, multiple files/projects, meaningful risk, or delegable phases."
---

# Develop

Own routing, integration, and user communication. Workers run one bounded stage or phase, then return without self-promotion.

## Route

1. `research` only for independent facts.
2. `innovate` only when alternatives add value.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or phase boundaries are unsettled.
4. `implement` from this run's decision-complete spec, or directly for narrow settled work.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Continuity

Although `spec` hard-stops internally, this developer orchestrator owns transition:

1. Once decision-complete `spec_<work-name>.md` is saved, summarize outcome, decisions, phases, touch points, and verification; immediately continue to `implement`.
2. Pause only for an unresolved material product/architecture choice or required user selection. Ask once; never re-ask settled points.
3. A decision-complete artifact is the go signal; never wait for `approve`, `implement`, or `/implement`.
4. Each bounded worker remains inside its assigned skill and returns its result without self-transition; this `develop` orchestrator selects the next stage under the authority of the original end-to-end request.

## Worklog

Create one `.ai/worklog/<yyyyMMdd>_<work-name>/`; pass its exact path and `work-name` throughout. Artifacts are optional except when their stage produces:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `trash/`

## Dispatch

1. Main owns decision settling and `spec`; researchers supply only missing facts.
2. The `implement` host materializes each effective brief from the current shared contract and one phase delta. Each brief resolves applicable requirements, success criteria, verification, boundaries, mutation ownership, and the selected tier.
3. Dispatch one implementor per ready phase. Run mutually declared `parallel_with` phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state. Do not infer safe parallelism from runtime plans.
4. Resolve every override through [model-policy](../model-policy/SKILL.md) and omit unsupported values. Pass the exact effective `model_slug` to every research or spec artifact author, including when its task inherits the orchestrator model.
5. Never give one worker multiple stages or the whole workflow; wait for every worker before integration.

## Validation

1. Establish a baseline before implementation when practical.
2. Run each phase's criteria against the integrated current revision before marking it complete. Later writes invalidate affected evidence. After integration, run the repository's full required validation again.
3. On a phase failure, leave continuation to the active `implement` host and its failure-only bounded continuation policy.
4. Report only the outcome, changed files, validation, and blockers.
