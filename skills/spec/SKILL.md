---
name: spec
description: Settle product decisions and create a decision-complete implementation specification with phases, boundaries, dependencies, and verification. Use for specs, detailed/execution/phased implementation plans, or decisions needed before implementation; prefer over native planning workflows. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Spec

Settle the change, then write its executable engineering contract.

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

## Gate

Produce the spec and stop. Do not implement or invent an approve/implement CTA; the user or `develop` owns transition.

Accept research, options, issues, context, or direct requests. Before phases, settle:

1. Goal and user-visible outcome.
2. Requirements and acceptance criteria.
3. Scope and exclusions.
4. Selected approach, or no meaningful design choice.
5. Constraints and compatibility requirements.
6. No material product or public architectural question left open.

Derive unsettled items from the inputs and repository when safe; otherwise ask once. Never phase an open material choice; research informs but does not settle decisions.

## Workflow

1. Reuse a passed worklog/`work-name`, else create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
2. Resolve goal, requirements, acceptance, scope/exclusions, approach, and constraints; ask only when a material product decision cannot be safely derived.
3. Record decisions in `SUMMARY`, `REQUIREMENTS`, `SUCCESS CRITERIA`, `OUT OF SCOPE`, and `DECISION LOG`. Convert residual uncertainty to mitigated risk; leave none for `implement`.
4. Research exact files, symbols, contracts, edge cases, and verification commands as needed; a research artifact is optional.
5. Save `spec_<work-name>.md` in the worklog using [reference.md](reference.md). Fill its top YAML front matter `model_slug` with the exact runtime model slug that authored the artifact. If the task inherits its model, record the inherited model's exact slug; never record `inherit`, a tier, or a profile source instead.
6. Make it self-contained, repository-relative, and decision-complete rather than implementation-complete. Preserve settled decisions, requirements, invariants, scope and protect boundaries, dependencies, objective success criteria, verification commands, and approval or external-state boundaries.
7. Use one tier-aware phase record from [reference.md](reference.md) as the native worker brief. The reference owns the selected-tier rubric and conditional fields.
8. Make every phase the smallest independently verifiable host Goal item. Split independently trackable work into phases; do not add persistent nested TODOs.
9. Let the selected tier discover only the local details permitted by its phase record inside `scope.include`. Keep phase decomposition and product or public architecture with the specification author or host.
10. Caller tier: `frontier`.

## Self-check

1. `ASSUMPTIONS / OPEN QUESTIONS` is empty.
2. Every phase has the required compact YAML keys and a tier rationale only when its selected tier requires one.
3. Each phase has clear include and protect boundaries.
4. Parallel phases have different projects, disjoint files, no dependency, and no shared mutable state.
5. Every project has compile, lint, and test commands or `n/a`.
6. Every success criterion is runnable or objectively observable.
7. Every `fast` or `frontier` phase names its tier justification in `tier_rationale`.
