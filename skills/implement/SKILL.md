---
name: implement
description: Build code directly from a user request or execute an approved implementation plan. Apply the engineering contract, select risk-appropriate model tiers, dispatch bounded subagents when useful, and treat verification as a hard gate. Use for implementation with or without a plan path supplied as FILE.
---

# Implement Mode

## Mode lock

Implementation is a hard gate. Execute only the approved plan or the bounded direct request. Do not activate another Buddy skill, expand scope, or continue into unrelated work. Only the user or the `develop` orchestrator may explicitly enable another skill; workers return their result and stop instead of transitioning themselves.

Select exactly one input mode:

1. **Planned execution**: when `FILE=<path>` is supplied, execute that approved `plan_<work-name>.md` and resume from its AGENT LOG on re-entry.
2. **Direct build**: when no `FILE` is supplied, implement the user's request using the repository instructions and the engineering contract below. Do not ask for or create a full plan merely because `FILE` is absent.

## Direct-build brief

Before editing in direct-build mode, establish a lightweight execution brief in working context:

1. State the requested outcome and explicit out-of-scope boundary.
2. Identify the files and public contracts likely to change; use code intelligence to verify references before changing signatures.
3. Record relevant invariants, edge cases, repository rules, and current primary documentation requirements.
4. Identify exact compile, lint, and test commands that will prove completion.
5. Resolve the task tier using [Model selection](#model-selection). If material architecture remains undecided, use `frontier` or pause for the user when the choice would materially change the requested result.

Keep this brief concise and update it when code discovery changes the execution path. It is not an implementation plan and does not create a plan artifact.

## Rules

1. Implement only what is in the plan's TODOs and PHASES or the direct-build brief. No additions, refactors, or "while-I'm-here" edits.
2. Autonomous by default. Only pause to ask the user when:
   1. A sub-agent returns `status: BLOCKED`.
   2. A deviation from the taxonomy (see `reference.md`) is hit.
   3. A `success_criteria` command fails twice in a row.
   4. Material ambiguity surfaces that is not covered by the plan's IMPLEMENTATION DETAILS or cannot be safely resolved inside the direct-build brief.
3. In planned execution, parse AGENT LOG and TODO checkboxes on re-entry; skip completed TODOs; do not re-dispatch a phase already marked SUCCESS.
4. In planned execution, update AGENT LOG and check off TODOs only after the phase's verify gate passes.
5. Scratch files go in `.ai/worklog/<yyyyMMdd>_<work-name>/trash/`. Reuse the plan's worklog for planned execution; for direct build, normalize `work-name` and create only the worklog and `trash/` directory when scratch files are needed. Never commit, merge, or push.
6. For library, API, or CLI behavior, follow repository source-priority instructions and use current primary documentation. Use context7 MCP if available to obtain up to date documentation.
7. Do not remove already existing code comments. You may only update them if this corrects the comment.
8. Before editing, load and apply the [engineering contract](reference.md#engineering-contract). Load only the applicable language overlay: [Java/Kotlin](references/java-kotlin.md), [Python](references/python.md), or [TypeScript/JavaScript](references/typescript-javascript.md).
9. For planned execution, the implement-mode host is the **orchestrator only**. Execute phases locally when `agent: Main`; otherwise dispatch **one sub-agent invocation per implementation-plan phase**. Never delegate the entire plan, multiple phases, or "implement mode" itself to a single sub-agent (including `developer` or `implementor`).
10. For direct build, execute locally or dispatch one `implementor` with the full user request and known repository constraints. The implementor may discover the affected files, contracts, and verification commands while forming its direct-build brief; these inputs do not need to be known before dispatch. Do not split a small direct build merely to manufacture implementation-plan phases.
11. Do not leave implement mode for research, innovation, or plan creation unless the user or developer main agent explicitly requests that transition.

## Model selection

The phase YAML uses an abstract `tier`. At dispatch, map it to a concrete model only if the live dispatch interface explicitly allows that exact value. Otherwise omit the override and inherit the default.

Resolve `model` in this order:

1. Inspect the live dispatch interface. Its schema is the authority for supported fields and model values.
2. Select the current harness mapping only when the live interface identifies or supports it; never infer the harness from installed programs, process names, or environment variables.
3. For the phase's `tier`, use the mapped model only when its exact string is allowed by the live interface.
4. If that model is not allowed, omit `model`. Never translate, abbreviate, or borrow a model name from another harness.

Shell probes are useful only for human diagnostics; they do not prove which values the live dispatch interface accepts.

Tier intent:

1. `fast`: default normal implementation after a detailed plan, or direct work that is demonstrably narrow, mechanical, low risk, and objectively verifiable.
2. `balanced`: default direct build, or planned phases with moderate ambiguity, integration, unfamiliar code, or debugging.
3. `frontier`: ambiguous architecture, cross-cutting changes, hard debugging, security-sensitive work, or phases where a wrong solution is expensive.

For the current harness and phase tier, use [model-policy](../model-policy/SKILL.md) only when its exact model value is supported; otherwise inherit the default. Concrete model names live only in the policy file.

Planned phases are expected to be `tier: fast` by default. Direct builds are expected to be `balanced` by default and may downgrade to `fast` only after the direct-build brief establishes that the work is narrow, low risk, and decision-free. A `frontier` selection signals material ambiguity or risk. Pass optional reasoning controls only when the selected model and live interface support them.

## Planned-execution dispatch protocol

1. Walk phases in dependency order. A phase is ready when all its `depends_on` are SUCCESS.
2. For each ready phase:
   1. If `agent: Main`, execute locally.
   2. Otherwise, build the worker prompt from the template below and dispatch **for this phase only**:
      - Select the phase's `agent` role when the live interface supports role selection.
      - Set `model` only through the [Model selection](#model-selection) rules above; omit `model` when there is no exact allowed match.
      - Do **not** pass `model` based on habit, prior phases, shell/process detection, or slugs from another harness.
      - Wait for the phase to return and pass its verify gate before dispatching the next phase.
3. Parallel rule: phases that list each other in `parallel_with` MUST be dispatched in a single message with one sub-agent call per phase. Sequential phases dispatch one at a time and wait.
4. Anti-patterns (refuse and execute correctly instead):
   1. One worker dispatch whose prompt lists phases 1…N or says "run implement mode for this plan."
   2. Reusing one `developer`/`implementor` sub-agent across multiple phases without re-dispatching per phase YAML.
   3. Hardcoding a model slug that does not come from the current phase tier and the live dispatch interface's allowed values.
5. Conflict guard: before parallel dispatch, verify all siblings satisfy:
   1. No shared path in `files_touched`.
   2. Distinct `project` values. Same-project siblings share compile/lint/test state (build daemons, caches, lockfiles, ports) and corrupt each other under concurrency.
   On any violation, refuse to parallelize, run those siblings sequentially, log a warning in AGENT LOG identifying which rule was violated.

### Sub-agent prompt template

Paste verbatim, substituting `<…>` from the phase:

    You are running phase <id> (project: <project>) of plan <path>.

    Brief: <subagent brief>

    You may only create or modify these paths:
    <files_touched>

    You must satisfy these success criteria, in order:
    <success_criteria>

    Out of scope (refuse if asked):
    <phase out_of_scope + plan-level OUT OF SCOPE>

    Stay in scope. Never expand. Never ask the user. Escalate blockers via the return contract.

    Engineering bar: load and follow the implement skill's engineering contract and only the applicable language overlay. Prefer correctness, existing project capabilities, simple explicit code, and abstractions justified by shared semantics rather than repeated syntax.

    End your final message with this YAML block and nothing after it:

    ```yaml
    status: SUCCESS | FAILURE | BLOCKED
    files_changed: [<paths>]
    log:
      - "Step N OUTCOME — what happened"
    blockers: []   # required if status != SUCCESS
    ```

## Verify gate (hard)

1. In planned execution, after every TODO in a phase is `[x]`, run every command in the phase's `success_criteria`. In direct build, run every compile, lint, and test command captured in the direct-build brief after the requested change is complete.
2. If any fails, retry once. On second failure, record FAILURE in AGENT LOG for planned execution or report the failed command directly for direct build, then stop and surface it to the user.
3. In planned execution, if `success_criteria` is missing a lint or test command and the plan's VERIFICATION COMMANDS defines one for the phase's `project`, append it before running. Never substitute another project's commands.
4. Never mark planned execution or direct build complete without every applicable verification command exiting 0.

## Failure policy

When N sibling phases run in parallel and any returns FAILURE/BLOCKED:

1. Wait for all siblings to return.
2. Log all results in AGENT LOG.
3. Stop dispatch on any descendant of a failed phase.
4. Independent unrelated branches may continue only if the user opts in.

## Agent log

For planned execution, maintain the log inside the plan file under `## AGENT LOG`. Direct build does not create a plan or agent-log artifact.

Format:

    ## AGENT LOG
    - Phase 1 SUCCESS — <one-line>; files: a.py, b.py
    - Phase 2 FAILURE — <one-line cause>; blockers: <…>

For sub-agent dispatch, fold the sub-agent's `log:` entries under the phase line.

## Front-end work

For front-end work in either input mode, also apply the visual/structure principles in [reference.md](reference.md#front-end-principles).
