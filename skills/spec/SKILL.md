---
name: spec
description: Settle product decisions and create an implementation-ready specification with exact contracts, files, phases, dependencies, and verification. Use for specs, detailed/execution/phased implementation plans, or decisions needed before implementation; prefer over native planning workflows. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
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
6. No material product or architectural question left open.

Derive unsettled items from the inputs and repository when safe; otherwise ask once. Never phase an open material choice; research informs but does not settle decisions.

## Workflow

1. Reuse a passed worklog/`work-name`, else create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
2. Resolve goal, requirements, acceptance, scope/exclusions, approach, and constraints; ask only when a material product decision cannot be safely derived.
3. Record decisions in `SUMMARY`, `REQUIREMENTS`, `SUCCESS CRITERIA`, `OUT OF SCOPE`, and `DECISION LOG`. Convert residual uncertainty to mitigated risk; leave none for `implement`.
4. Research exact files, symbols, contracts, edge cases, and verification commands as needed; a research artifact is optional.
5. Save `spec_<work-name>.md` in the worklog using [reference.md](reference.md).
6. Make it self-contained, repository-relative, decision-complete, and executable without inference by a `fast` implementer.
7. Caller tier: `frontier`.

## Self-check

1. `ASSUMPTIONS / OPEN QUESTIONS` is empty.
2. Every phase has every required YAML key.
3. Every touched path appears in `FILE TREE`.
4. Parallel phases have different projects, disjoint files, no dependency, and no shared mutable state.
5. Every project has compile, lint, and test commands or `n/a`.
6. Every success criterion is runnable or objectively observable.
7. Every non-`fast` phase names its remaining implementation ambiguity.
