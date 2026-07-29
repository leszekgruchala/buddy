---
name: develop
description: "Orchestrate non-trivial coding through needed research, optional innovation, decision-settling spec, implementation, and validation. Use for end-to-end changes with unclear decisions, multiple files/projects, meaningful risk, or delegable phases."
---

# Develop

Own routing, integration, and user communication. Workers run one bounded stage or phase, then return without self-promotion.

## Route

1. `research` only for independent facts.
2. `innovate` only when alternatives add value.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or exact implementation mapping are unsettled.
4. `implement` from this run's decision-complete spec, or directly for narrow settled work.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Continuity

Although `spec` hard-stops internally, this developer orchestrator owns transition:

1. Once decision-complete `spec_<work-name>.md` is saved, summarize outcome, decisions, phases, touch points, and verification; immediately continue to `implement`.
2. Pause only for an unresolved material product/architecture choice or required user selection. Ask once; never re-ask settled points.
3. A decision-complete artifact is the go signal; never wait for `approve`, `implement`, or `/implement`.

## Worklog

Create one `.ai/worklog/<yyyyMMdd>_<work-name>/`; pass its exact path and `work-name` throughout. Artifacts are optional except when their stage produces:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `trash/`

## Dispatch

1. Main owns decision settling and `spec`; researchers supply only missing facts.
2. Dispatch one implementor per ready phase. Run mutually declared `parallel_with` phases together only with different projects, disjoint files, no dependency, and no shared mutable state.
3. Resolve every override through [model-policy](../model-policy/SKILL.md) and omit unsupported values.
4. Never give one worker multiple stages or the whole workflow; wait for every worker before integration.

## Validation

1. Establish a baseline before implementation when practical.
2. Run each phase's criteria before marking it complete; after integration, run the repository's full required validation.
3. After a command fails twice, stop and surface evidence.
4. Report only the outcome, changed files, validation, and blockers.
