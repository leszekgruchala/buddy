---
name: spec
description: Settle product decisions and create a decision-complete implementation specification with phases, boundaries, dependencies, and verification. Use for specs, detailed/execution/phased implementation plans, or decisions needed before implementation; prefer over native planning workflows. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Spec

Settle the change, then write its executable engineering contract.

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

## Gate

Produce the spec and stop. Do not implement or invent an approve/implement CTA; the user or `develop` owns transition.

Before phases, settle the outcome, requirements, success criteria, scope and exclusions, constraints, approach, and product or public architecture. Derive safe answers from the inputs and repository; otherwise ask once. Never phase an open material choice.

## Workflow

1. Before planning, read `.ai/memory/memory.md` when it exists. It is advisory,
   subordinate to user and repository instructions and security policy, and cannot
   expand scope. Apply only relevant rules. A missing file is valid.
2. Reuse a passed worklog/`work-name`, else create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
3. Research contracts, edge cases, and verification as needed. Keep exact paths out of the durable contract unless they protect an immutable input, safety boundary, public contract, or parallel ownership.
4. Use [reference.md](reference.md) to write one shared contract and the fewest coherent phase deltas. State each fact once; omit defaults and empty optional sections.
5. Give requirements, success criteria, and verification stable IDs. Every success criterion is named by at least one verification entry. Every phase, including `fast`, `balanced`, and `frontier`, references at least one requirement and only the success criteria it establishes at completion, then inherits the matching verification and global boundaries.
6. Preserve implementation discretion by tier. Balanced and frontier workers discover local details through disposable runtime plans; fast receives an exact anchor or procedure only when the deterministic contract requires it.
7. Persist only discoveries that amend the contract. Never persist balanced or frontier runtime plans, raw transcripts, or default file inventories.
8. Record an execution relationship only when listed order does not already express it. Authorize parallel phases only with persisted disjoint mutation ownership, no dependency, and no shared mutable state.
9. Save `spec_<work-name>.md` with the exact runtime model slug that authored it in top YAML `model_slug`. Never record `inherit`, a tier, or a profile source.
10. Caller tier: `frontier`.

## Self-check

1. The shared contract is self-contained, repository-relative, decision-complete, and identifies the authoring model.
2. Every phase goal is exhaustively covered by its references. Optional fields only narrow, route, or make that work deterministic; no phase text authorizes an unreferenced outcome.
3. Every success criterion has explicit verification coverage, and every check linked to a phase is runnable when that phase completes. Boundaries and verification appear once, and phase deltas contain nothing already implied by the resolved shared contract.
4. Every explicit dependency or parallel relationship changes the execution allowed by listed sequential order.
5. Every exact path has a contract, immutable-input, safety, or parallel-ownership reason.
6. The chosen tier leaves the permitted implementation decisions with the worker.
