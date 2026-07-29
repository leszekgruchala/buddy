# Spec reference

Load only while authoring a spec.

## Phase choices

- `agent`: `Main` | `implementor` | `researcher` | `test-runner`; use `Main` only when dispatch costs more than local work.
- `tier`: `fast` | `balanced` | `frontier`; default `fast`, raising it only for ambiguity named in the brief.
- `reasoning_effort`: `low` | `medium` | `high` | `xhigh` | `max`.
- `project` is the smallest independently verified repo, package, module, or workspace.
- Parallel phases require different projects, disjoint files, no dependency, and no shared mutable state.

## Template

````markdown
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

## FILE TREE
- `path/to/file.ext` — <purpose>

## IMPLEMENTATION DETAILS
<exact signatures, data shapes, invariants, behavior, errors, edge cases, and test names; prose only>

## PHASES

### Phase 1 — <name>

```yaml
id: 1
agent: implementor
tier: fast
reasoning_effort: medium
project: <verification scope>
depends_on: []
parallel_with: []
files_touched:
  - path/to/file.ext
success_criteria:
  - <command or observable assertion>
out_of_scope:
  - <phase boundary>
```

Subagent brief:

> <goal, inputs, outputs, success, and guardrails in one short paragraph>

TODOs:
- [ ] 1.1 <atomic, single-verb action>

## DECISION LOG
- <yyyyMMdd tt:mm>: | Decision: … | Rationale: …

## AGENT LOG
````
