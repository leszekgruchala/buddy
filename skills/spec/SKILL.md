---
name: spec
description: Settle decisions and write a phased spec with boundaries, dependencies, and verification. Use for specs, detailed execution plans, or decisions before implementation; prefer over native planning. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Spec

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `frontier`.
When needed, use a bounded `spec` worker for reasoning and artifact authorship; the host retains user communication and decisions.

## Gate

Produce the spec and stop. Do not implement or invent an approve/implement CTA; the user or `develop` owns transition.

Before phases, settle outcome, requirements, success criteria, scope/exclusions, constraints, approach, and product/public architecture. Derive safe answers from inputs and repository; otherwise ask once. Never phase an open material choice.

## Workflow

1. Before planning, read `.ai/memory/memory.md` when present. Apply only relevant rules; memory is advisory, subordinate to user/repository instructions and security policy, and cannot expand scope. A missing file is valid.
2. Reuse a passed worklog/`work-name`, else create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
3. Research contracts, edge cases, and verification as needed. Include exact paths only for immutable inputs, safety, public contracts, or parallel ownership.
4. Use [reference.md](reference.md) to write one shared contract and the fewest coherent phase deltas. State each fact once; omit defaults and empty optional sections.
5. Give requirements, criteria, and verification stable IDs. Every success criterion is named by at least one verification entry. Every phase, including `fast`, `balanced`, and `frontier`, references at least one requirement and only the success criteria it establishes at completion, inheriting matching verification and global boundaries.
6. Balanced and frontier workers discover local details through disposable runtime plans; fast receives exact anchors/procedures only when the deterministic contract requires them. Persist only contract amendments, never runtime plans, raw transcripts, or default file inventories.
7. Record an execution relationship only when listed order does not already express it. Parallel phases require persisted disjoint mutation ownership, no dependency, and no shared mutable state.
8. Save `spec_<work-name>.md` with its author's verified exact runtime model slug in top YAML `model_slug`; never `inherit`, a tier, unresolved alias, or unverified requested model.

## Self-check

1. The shared contract is self-contained, repository-relative, decision-complete, and identifies its authoring model.
2. References cover every phase outcome. Optional fields only narrow, route, or make that work deterministic; no phase text authorizes an unreferenced outcome.
3. Confirm verification coverage: every check linked to a phase is runnable when that phase completes. Deltas contain nothing already implied by the resolved shared contract.
4. Explicit dependencies/parallel relationships change the execution allowed by listed order.
5. Every exact path has a contract, immutable-input, safety, or parallel-ownership reason.
6. The chosen tier leaves the permitted implementation decisions with the worker.
7. Final acceptance follows [reference.md](reference.md#final-acceptance), including its rule for a last acceptance phase.
