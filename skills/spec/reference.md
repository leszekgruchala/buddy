# Spec reference

Load only while authoring a spec.

## Contract

The durable specification contains one shared contract and compact phase deltas. The shared contract is authoritative at its recorded revision and applies to every phase.

Required sections:

1. `SUMMARY` — user-visible outcome.
2. `REQUIREMENTS` — atomic items with stable IDs such as `R1`.
3. `SUCCESS CRITERIA` — observable integrated-revision results with IDs such as `SC1`.
4. `BOUNDARIES` — shared mutation scope, exclusions, compatibility, security, approvals, external state, and product or public-architecture constraints.
5. `VERIFICATION` — commands and objective observations for the integrated revision.

Add `DECISION LOG`, `RISKS`, `INPUTS`, or `AGENT LOG` only when material. Increment `contract_revision` for an amendment that changes a decision, requirement, criterion, boundary, dependency, approval, or public contract. Invalidate and recheck every affected earlier checkpoint before completion.

## Phase delta

Every phase contains `id`, `goal`, non-empty `requirements`, and non-empty `success_criteria`. The two lists reference shared IDs; they never copy contract text.

Add only non-default fields:

- `agent`: default `implementor`.
- `tier`: default `balanced`; `fast` and `frontier` require `tier_rationale`.
- `depends_on` or `parallel_with`: only for real execution relationships; listed order is otherwise sequential.
- `ownership`: persisted mutation authority when a phase needs a narrower or parallel boundary. A sequential phase without it inherits the shared mutation scope as exclusive ownership for its run. Exact paths require a stated contract, immutable-input, safety, or parallel-ownership reason.
- `constraints`: phase-only restrictions absent from the shared contract.
- `anchor` or `procedure`: use for `fast` when its goal and referenced contract do not already make the deterministic transformation explicit.

Never repeat global boundaries, verification, requirements, criteria, file inventories, or decisions. Never write default fields or empty arrays. Use the fewest coherent phases that preserve dependency, ownership, approval, rollback, and verification boundaries.

Parallel phases require different projects, persisted disjoint mutation ownership, no dependency, and no shared mutable state. A runtime plan cannot establish durable authority.

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

## BOUNDARIES

- B1: <boundary>

## VERIFICATION

- V1: `<command or observation>`

## PHASES

```yaml
id: P1
goal: <coherent phase outcome>
requirements: [R1]
success_criteria: [SC1]
```
````

The host materializes an effective brief from the current shared contract and one phase delta. It records compact current-revision evidence after integrated verification, never the worker's runtime plan.
