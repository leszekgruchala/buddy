# Spec reference

Load only while authoring a spec.

## Contract

Write one shared contract, authoritative at its recorded revision for every phase, and compact phase deltas.

Required sections:

1. `SUMMARY` — user-visible outcome.
2. `REQUIREMENTS` — atomic items with stable IDs such as `R1`.
3. `SUCCESS CRITERIA` — observable integrated-revision results with IDs such as `SC1`.
4. `BOUNDARIES` — shared mutation scope, exclusions, compatibility, security, approvals, external state, and product or public-architecture constraints.
5. `VERIFICATION` — stable-ID commands and objective observations for the integrated revision. Write each as `V1 [SC1, SC2]: ...`; every success criterion is named by at least one verification entry. A verification entry names only criteria that require it to complete. Express a later-lifecycle recheck as a distinct terminal criterion.

Add `DECISION LOG`, `RISKS`, `INPUTS`, or `AGENT LOG` only when material. Amendments to decisions, requirements, criteria, boundaries, dependencies, approvals, or public contracts increment `contract_revision` and invalidate affected checkpoints; recheck them before completion.

## Phase delta

Every phase contains `id`, `goal`, non-empty `requirements`, and non-empty `success_criteria`. Lists reference shared IDs, never copy text, and cover every goal outcome/deliverable. Reference only criteria established at phase completion, not related criteria inherited from earlier phases. Optional fields only narrow, route, or make work deterministic. They never add deliverables, behavior, acceptance conditions, or shared-contract restrictions.

Add only non-default fields:

- `agent`: default `implementor`.
- `tier`: default `balanced`; `fast` and `frontier` require `tier_rationale`.
- `depends_on` or `parallel_with`: only when the relationship changes the execution allowed by listed sequential order. Do not restate that a phase follows the phase immediately before it.
- `ownership`: persisted narrower or parallel mutation authority. Otherwise a sequential phase exclusively inherits shared mutation scope for its run. Exact paths need a stated contract, immutable-input, safety, or parallel-ownership reason.
- `constraints`: phase-only restrictions absent from the shared contract.
- `anchor` or `procedure`: use for `fast` when its goal and referenced contract do not already make the deterministic transformation explicit.

Runner/tier settings recommend capability. Apply scoped user overrides through [model selection](../develop/model-selection.md), retaining the phase's work instructions and discretion below.

Never repeat global boundaries, verification, requirements, criteria, inventories, or decisions. For optional text, remove it when the resolved shared contract already implies it. Omit defaults and empty arrays. Minimize phases while preserving dependency, ownership, approval, rollback, and verification boundaries.

Parallel phases require different projects, persisted disjoint mutation ownership, no dependency, and no shared mutable state. A runtime plan cannot establish durable authority.

## Final acceptance

Every spec requires a final check against all requirements and success criteria. Add a last acceptance phase unless the spec has one documentation or formatting phase with no behavior or public-contract change. Use distinct terminal criteria for acceptance checks that require all implementation phases.

## Tier discretion

- `balanced` discovers files, local decomposition, implementation technique, and tests inside the contract.
- `frontier` has balanced discretion and may choose technical architecture or algorithms inside settled product and public-architecture boundaries.
- `fast` performs a deterministic transformation with deterministic verification and no diagnosis or technical choice.

Balanced and frontier runtime plans are disposable. Persist consequential discoveries only through a contract amendment.

## Template

````markdown
---
model_slug: <exact runtime model slug>
contract_revision: 1
---

# <spec-name>

## SUMMARY
<outcome>

## REQUIREMENTS

- R1: <requirement>

## SUCCESS CRITERIA

- SC1: <observable result>
- SC2: The final implementation satisfies R1 and SC1.

## BOUNDARIES

- B1: <boundary>

## VERIFICATION

- V1 [SC1]: `<command or observation>`
- V2 [SC2]: Check R1 and SC1 against the final integrated revision; cite valid evidence or rerun affected checks.

## PHASES

```yaml
id: P1
goal: <coherent phase outcome>
requirements: [R1]
success_criteria: [SC1]
```

```yaml
id: P2
goal: Validate the final implementation against the whole specification.
requirements: [R1]
success_criteria: [SC2]
```
````

Omit P2, SC2, and V2 only for the [final acceptance](#final-acceptance) exception; the host's final check still applies.

The host materializes an effective brief from the current shared contract and one phase delta. It records compact current-revision evidence after integrated verification, never the worker's runtime plan.
