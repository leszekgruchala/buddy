---
name: develop
description: "Orchestrate a non-trivial coding change through only the needed Buddy stages: research, optional innovation, spec (which settles decisions when needed), implementation, and validation. Use for end-to-end work that has unclear decisions, multiple files or projects, meaningful risk, or independent phases worth delegating."
---

# Develop

Own routing, integration, and user communication. Workers execute one bounded stage or spec phase and return; they never promote themselves.

## Route

1. Use `research` only for independent factual questions.
2. Use `innovate` only when alternatives are explicitly useful.
3. Use `spec` when goal, requirements, acceptance, scope, approach, or constraints are not settled, or when exact implementation mapping is needed.
4. Use `implement` with a decision-complete spec from this run, or directly for narrow decision-complete work.

Skip stages that add no information. For non-trivial work, never skip the `spec` sufficiency gate.

## Continuity

`spec` always hard-stops as a skill. As the `develop` orchestrator (developer main agent), you own the next stage and must not invent a second approval gate.

1. After a decision-complete `spec_<work-name>.md` is saved, send a short summary (outcome, key decisions, phases, touch points, verification) and immediately continue to `implement`.
2. Pause only when a material product or architectural choice is still unresolved, or when the user must pick among alternatives. Ask once, then resume without re-asking settled points.
3. Never wait for `approve`, `implement`, or `/implement` when the artifact is already decision-complete under this orchestration. That saved artifact is the go signal.

## Worklog

Create one `.ai/worklog/<yyyyMMdd>_<work-name>/` and pass its exact path and `work-name` to every stage. Artifacts are optional except for stages that produce them:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `trash/`

## Dispatch

1. Main owns `spec` (including decision settling); dispatch bounded researchers only for missing facts.
2. During implementation, dispatch one implementor per ready spec phase. Run only mutually declared `parallel_with` phases together after confirming different projects, disjoint files, no dependency, and no shared mutable state.
3. Resolve every override through [model-policy](../model-policy/SKILL.md) and omit unsupported values.
4. Never ask a worker to run multiple stages or the whole workflow.
5. Wait for every dispatched worker before integrating its stage.

## Validation

1. Establish a baseline before implementation when practical.
2. Run each phase's success criteria before marking it complete.
3. Run the repository's full required validation after integration.
4. Stop after two failures of the same command and surface the evidence.
5. Report only the outcome, changed files, validation, and blockers.
