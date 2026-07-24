---
name: spec
description: Settle product decisions when needed and create an implementation-ready technical specification with exact contracts, files, phases, dependencies, and verification. Use when the user asks for a spec, detailed or execution plan, phased implementation plan, or needs decisions settled before implementation; prefer this skill over a harness-native planning workflow.
---

# Spec

Settle what should change when needed, then turn those decisions into an executable engineering contract.

## Gate

Specification is a hard gate for this skill. Produce the spec and stop. Do not activate another Buddy skill or implement. Do not invent an approve/implement CTA — the caller (user or `develop` orchestrator) owns the next stage.

Accept research, innovation options, an issue, user context, or a direct request. Before writing phases, ensure all are settled:

1. Goal and user-visible outcome.
2. Requirements and acceptance criteria.
3. Scope and exclusions.
4. Selected approach, or no meaningful design choice.
5. Constraints and compatibility requirements.
6. No material product or architectural question left open.

When an item is unsettled, derive it safely from the inputs and repository, or ask the user once. Do not invent phases while a material choice remains open. Research alone never settles decisions — use it as evidence while deciding.

## Workflow

1. Reuse a passed worklog and `work-name`; otherwise create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
2. Read supplied inputs. Resolve goal, requirements, acceptance criteria, scope, exclusions, approach, and constraints. Ask only when a material product decision cannot be derived safely.
3. Record settled decisions in the spec (`SUMMARY`, `REQUIREMENTS`, `SUCCESS CRITERIA`, `OUT OF SCOPE`, `DECISION LOG`). Leave no unresolved decision for `implement`. Record residual uncertainty as a risk with a mitigation, not an open choice.
4. Perform bounded implementation research for exact files, symbols, contracts, edge cases, and verification commands; a separate research artifact is optional.
5. Save `spec_<work-name>.md` in the worklog using [reference.md](reference.md).
6. Keep the spec self-contained, repository-relative, decision-complete, and executable by a `fast` implementer without inference.
7. Use `frontier`; resolve dispatch overrides through [model-policy](../model-policy/SKILL.md).

## Self-check

1. `ASSUMPTIONS / OPEN QUESTIONS` is empty.
2. Every phase has every required YAML key.
3. Every touched path appears in `FILE TREE`.
4. Parallel phases have different projects, disjoint files, no dependency, and no shared mutable state.
5. Every project has compile, lint, and test commands or `n/a`.
6. Every success criterion is runnable or objectively observable.
7. Every non-`fast` phase names its remaining implementation ambiguity.
