# Spec reference

Load only while authoring a spec.

## Phase choices

- `agent`: `Main` | `implementor` | `researcher` | `test-runner`; use `Main` only when dispatch costs more than local work.
- `tier`: `fast` | `balanced` | `frontier`; use `balanced` by default.
- `fast`: an exception for a deterministic transformation inside the named scope. It needs no diagnosis, API or data-model choice, test-strategy choice, or execution-order judgment. Its verification is deterministic.
- `frontier`: an exception for a fixed phase with substantial remaining cross-cutting technical or algorithmic judgment. It does not settle product or public architecture.
- `tier_rationale`: one sentence required only for `fast` and `frontier` that explains the exception.
- `project` is the smallest independently verified repo, package, module, or workspace.
- Parallel phases require different projects, disjoint files, no dependency, and no shared mutable state.
- `scope.include` declares the subsystem where the worker may discover files, local decomposition, implementation technique, and tests. `scope.protect` names boundaries that the worker must not cross.
- `goal` states the phase task. `success_criteria` state its independently verifiable completion. Split separate trackable work into phases; do not add persistent nested TODOs.

Every phase requires `id`, `agent`, `tier`, `goal`, `project`, `depends_on`, `parallel_with`, `scope.include`, `scope.protect`, `success_criteria`, and `out_of_scope`. Add `tier_rationale` only for `fast` or `frontier`. Add `why` or `guidelines` only when they supply information that the other fields do not.

## Template

````markdown
---
model_slug: <exact runtime model slug>
---

# <spec-name>

## SUMMARY
<user-visible outcome and how to observe it>

## REQUIREMENTS
1. <atomic, testable requirement>

## SUCCESS CRITERIA
- <observable behavior>

## OUT OF SCOPE
- <explicit exclusion>

## CONSTRAINTS
- <compatibility, security, performance, or delivery constraint; may be empty>

## ASSUMPTIONS / OPEN QUESTIONS
- (must be empty)

## RISKS
- <risk and mitigation; may be empty>

## INPUTS
- `<path>` — <why it matters; may be empty>

## VERIFICATION COMMANDS
- project: <id>
  compile: `<command or n/a>`
  lint: `<command or n/a>`
  test: `<command or n/a>`

## PHASES

### Phase 1 — <name>

```yaml
id: 1
agent: implementor
tier: balanced
goal: Add the customer endpoint with the settled behavior.
why: The endpoint makes the approved search contract available to clients.
project: <verification scope>
depends_on: []
parallel_with: []
scope:
  include:
    - src/customers/
  protect:
    - Public API decisions outside the settled endpoint contract
guidelines:
  - Keep the existing authentication boundary.
success_criteria:
  - <command or observable assertion>
out_of_scope:
  - <phase boundary>
```

The phase record is the worker brief. Every tier uses this same schema. A worker may discover only details permitted by its selected tier inside `scope.include`, and stops before changing a settled decision, weakening a criterion, expanding external effects, crossing `scope.protect`, or colliding with another owner.

## DECISION LOG
- <yyyyMMdd tt:mm>: | Decision: … | Rationale: …

## AGENT LOG
````
