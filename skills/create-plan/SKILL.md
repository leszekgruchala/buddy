---
name: create-plan
description: Create a strict, phased technical plan saved under .ai/plans with parseable per-phase YAML for agent, tier, dependencies, files_touched, and success_criteria. Use when switching to plan mode or asked for a plan, execution plan, phased plan, or sub-agent dispatch plan.
---

# Create Plan

## Mode lock

Plan creation is a hard gate. Produce only the requested plan, return it to the caller, and stop. Do not activate another Buddy skill or begin implementation. Completion returns control; only a user instruction or bounded dispatch from the `develop` orchestrator authorizes a cross-skill transition.

Produce a strict, phased technical plan. The plan is the contract between planner and implementer: every field below is required, and the implementer trusts it.

Your ultimate goal is to conduct final research on the actual very detailed implementation of the prior research. For any missing data, you must finalize the research and make the decisions toward the actual code implementation and changes, end to end, including the validations, verifications, and tests depending on DTASC. The final created plan should have zero open points and be a fully defined document so that the other party that is implementing the plan can follow it thoroughly without zero unclear aspects.

You are unable at some point to make the plan redefined, push back to the user with additional clarifications and questions. 

## Rules

1. Save to `.ai/plans/<yyyyMMdd>_<plan-name>.md`. Create `.ai/plans/` if missing.
2. Output markdown only — no code, no snippets, no example code, no commit/merge/push.
3. Reference research from `.ai/research/`, including the project's verification commands captured by the research skill. If those commands are missing, ask the user before saving. Any contract a sub-agent must honor — data shapes, function signatures, API payloads, invariants — lives inline in `IMPLEMENTATION DETAILS`, not only behind a research pointer; a dispatched agent may never open those files.
4. Phases are units of independent work. Two phases are independent iff:
   1. Their `project` values differ. A `project` is the unit at which compile/lint/test is invoked (a repo, a monorepo package, a Gradle module, a Python package, an npm workspace). Same-project phases share build daemons, caches, lockfiles, generated artifacts, and verification ports, so they MUST NOT run in parallel even when `files_touched` is disjoint.
   2. Their `files_touched` sets do not intersect.
   3. Neither needs the other's output to satisfy its `success_criteria`.
   4. They share no other external mutable state (DB rows, ports, env vars, git ref).
   Independent phases declare each other in `parallel_with`. Dependent phases declare predecessors in `depends_on`.
5. Pick `agent` from the closed enum. Use `Main` only when sub-agent dispatch would cost more tokens than running locally.
6. Pick `tier` from `fast | balanced | frontier`. The implementer maps tier → concrete model; the plan stays portable across coding agents.
7. Per-TODO agent overrides are forbidden. If a TODO needs a different agent, it is its own phase.
8. TODOs are atomic, single-verb, CLI-friendly actions.
9. Use repository-relative paths only. Do not use absolute paths in `FILE TREE`, `files_touched`, briefs, TODOs, logs, or reports.
10. Self-check before saving:
   1. Every phase has all required YAML keys, including `project`.
   2. No path in any `files_touched` lies outside the FILE TREE.
   3. No two `parallel_with` siblings share a `files_touched` path.
   4. No two `parallel_with` siblings share a `project` value.
   5. Every phase's `project` appears as a key in `VERIFICATION COMMANDS`.
   6. Every `success_criteria` entry is a runnable command or an objectively checkable assertion, phrased as observable behavior (what runs and what output proves it) rather than an internal attribute (a struct/field added). For new tests, note that the test fails before the change and passes after.
   7. `ASSUMPTIONS / OPEN QUESTIONS` is empty. If not, ask the user and re-run self-check.
   8. Phases default to `tier: fast`; any `balanced`/`frontier` phase has its ambiguity named in the brief.
11. Report back if there is anything prohibiting you to make a targeted/decided plan, like still existing open questions.
12. The plan must be restartable from only itself plus the working tree: a fresh agent reading it top to bottom can resume without prior conversation. Record every design decision and mid-implementation course change in `DECISION LOG` with its rationale.
13. Do not overcomplicate. Simplicity is the virtue. Intrdouce abstractions where they are beneficial for better code composition, responsibility and reusability.
14. Remain in plan mode until the user or developer main agent explicitly signals implement. Do not invoke innovation or implementation from plan mode without that explicit request.

## Model policy

Planning runs at the `frontier` tier. The developer main agent owns the plan. Dispatch `researcher` only for missing final implementation research, then assemble and save the plan yourself. Resolve any model override through [model-policy](../model-policy/SKILL.md), and use it only when the live dispatch interface supports its exact value.

## Over-specification bar

The plan is the contract a `fast`-tier implementer executes without inference. Every phase brief and `IMPLEMENTATION DETAILS` entry must include, as applicable: exact file paths, function/class/type signatures, data shapes and invariants, error and edge cases, exact test names, and exact commands. No "the implementer will figure out X." If a real decision remains for the implementer, that phase is `tier: frontier` and the ambiguity is named explicitly.

## Default phase tier

Author phases at `tier: fast` by default. Reserve `balanced` or `frontier` for phases that are genuinely ambiguous even after planning, and note the ambiguity in the phase brief. This is what lets the implementer run on a cheaper model.

## Closed enums

- `agent`: `Main` | `implementor` | `researcher` | `test-runner`
- `tier`: `fast` | `balanced` | `frontier`
- `reasoning_effort`: `low` | `medium` | `high` | `xhigh` | `max`

See [reference.md](reference.md) for when to pick each.

## Plan template

Use exactly this shape (the outer block is shown indented to avoid fence collisions; copy the contents verbatim):

    # <plan-name>

    ## SUMMARY
    One paragraph: what someone can do after this change that they could not before, and how to see it working.

    ## REQUIREMENTS
    1. Atomic, testable, numbered.

    ## SUCCESS CRITERIA
    - Objectively checkable plan-level criteria.

    ## OUT OF SCOPE
    - Explicit exclusions sub-agents must refuse.

    ## ASSUMPTIONS / OPEN QUESTIONS
    - (must be empty before saving)

    ## RISKS
    - Known unknowns + mitigations. May be empty.

    ## PRIO RESEARCH
    - `.ai/research/<file>.md` — short why.

    ## VERIFICATION COMMANDS
    Per project. Each entry's `project` key MUST match a `project` value used in some phase. Sourced from research.
    - project: <id>
      compile: `<command>`
      lint: `<command>`
      test: `<command>`
    - project: <id>
      compile: `<command>`
      lint: `<command>`
      test: `<command>`
    (Repeat per project. Use `n/a` when a category does not apply. Single-project repos list exactly one entry.)

    ## FILE TREE
    - `path/to/file.ext` — 1-line description.
    (Authoritative. No file outside this list may be created or modified.)

    ## IMPLEMENTATION DETAILS
    Prose only. Decisions, contracts, data shapes. No code.

    ## PHASES

    ### Phase 1 — <phase name>

    ```yaml
    id: 1
    agent: implementor
    tier: fast
    reasoning_effort: medium
    project: backend             # required. Build/verification scope. Siblings in `parallel_with` MUST have a different `project`.
    depends_on: []
    parallel_with: [2]
    files_touched:               # repository-relative paths only
      - src/foo/bar.py
      - tests/test_bar.py
    success_criteria:
      - pytest tests/test_bar.py -q
      - <lint command from VERIFICATION COMMANDS for project: backend>
    out_of_scope:
      - Do not modify src/baz/**
    ```

    Subagent brief:

    > Goal, inputs, expected outputs, success, hard guardrails. One short paragraph
    > the orchestrator pastes verbatim into the sub-agent prompt.

    TODOs:
    - [ ] 1.1 atomic CLI-friendly action
    - [ ] 1.2 atomic CLI-friendly action

    ### Phase 2 — <phase name>
    … same shape …

    ## DECISION LOG
    (maintained during implement; makes the plan restartable from itself alone)
    - <yyyyMMdd tt:mm>: | Decision: … | Rationale: …

    ## AGENT LOG
    (maintained during implement)
