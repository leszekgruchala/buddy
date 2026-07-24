---
name: spec
description: Create an implementation-ready technical specification with exact contracts, files, phases, dependencies, and verification. Use when the user asks for a spec, detailed or execution plan, phased implementation plan, or provides decision-complete requirements; route to plan when product, scope, acceptance, approach, or constraint decisions remain.
---

# Spec

Turn settled decisions into an executable engineering contract.

## Gate

Specification is a hard gate for this skill. Produce the spec and stop. Do not activate another Buddy skill or implement. Do not invent an approve/implement CTA — the caller (user or `develop` orchestrator) owns the next stage.

A prior plan is preferred for non-trivial work but is not required. Accept a plan, research, issue, user context, or direct request only when all are settled:

1. Goal and user-visible outcome.
2. Requirements and acceptance criteria.
3. Scope and exclusions.
4. Selected approach, or no meaningful design choice.
5. Constraints and compatibility requirements.
6. No material product or architectural question.

If any item is missing, do not create a spec; report the missing decisions and require `plan`. Research alone never satisfies missing decisions.

## Workflow

1. Reuse a passed worklog and `work-name`; otherwise create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
2. Read supplied inputs. Perform bounded implementation research for exact files, symbols, contracts, edge cases, and verification commands; a separate research artifact is optional.
3. Save `spec_<work-name>.md` in the worklog using [reference.md](reference.md).
4. Keep the spec self-contained, repository-relative, decision-complete, and executable by a `fast` implementer without inference.
5. Use `frontier`; resolve dispatch overrides through [model-policy](../model-policy/SKILL.md).

## Self-check

1. `ASSUMPTIONS / OPEN QUESTIONS` is empty.
2. Every phase has every required YAML key.
3. Every touched path appears in `FILE TREE`.
4. Parallel phases have different projects, disjoint files, no dependency, and no shared mutable state.
5. Every project has compile, lint, and test commands or `n/a`.
6. Every success criterion is runnable or objectively observable.
7. Every non-`fast` phase names its remaining implementation ambiguity.
