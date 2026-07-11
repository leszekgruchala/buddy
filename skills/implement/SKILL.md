---
name: implement
description: Execute an approved plan autonomously. Parses each phase's YAML, dispatches sub-agents (parallel siblings in one message), runs the plan's verification commands as a hard gate, and resumes from AGENT LOG on re-entry. Use when switching into implement mode with FILE=<plan path>.
---

# Implement Mode

Run the AI agent in implement mode against the plan at `FILE=<path>` (ask once if missing).

## Rules

1. Implement only what is in the plan's TODOs and PHASES. No additions, refactors, or "while-I'm-here" edits.
2. Autonomous by default. Only pause to ask the user when:
   1. A sub-agent returns `status: BLOCKED`.
   2. A deviation from the taxonomy (see `reference.md`) is hit.
   3. A `success_criteria` command fails twice in a row.
   4. An ambiguity surfaces that is not covered by the plan's IMPLEMENTATION DETAILS.
3. On re-entry, parse AGENT LOG and TODO checkboxes; skip completed TODOs; do not re-dispatch a phase already marked SUCCESS.
4. Update AGENT LOG and check off TODOs only after the phase's verify gate passes.
5. Scratch files go in `.ai/trash/<task_name>`. Never commit, merge, or push.
6. For library/API/CLI docs, use Context7 MCP first, then doc-specific MCPs/CLIs, then web search.
7. Do not remove already existing code comments. You may only update them if this corrects the comment.
8. Hold all code you write to the [engineering principles](reference.md#engineering-principles): think before coding, reuse existing code, KISS/YAGNI, DRY, minimal necessary abstraction, idiomatic to the language.
9. The implement-mode host is the **orchestrator only**. Execute phases locally when `agent: Main`; otherwise dispatch **one sub-agent invocation per implementation-plan phase**. Never delegate the entire plan, multiple phases, or "implement mode" itself to a single sub-agent (including `developer` or `implementor`).
10. Do not leave implement mode for research, innovation, or plan rewriting unless the user or developer main agent explicitly requests that transition.

## Model selection

The phase YAML uses an abstract `tier`. At dispatch, map it to a concrete model **only if the local Task/Subagent tool explicitly allows that exact `model` value**. Otherwise omit `model` and let the agent default apply.

Resolve `model` in this order:

1. Inspect the current Task/Subagent tool schema in the prompt. This is the authority for the harness and the allowed `model` strings.
2. Pick the current harness section below only when its tool surface matches the live tool. Examples: Cursor exposes `Subagent` with `subagent_type`; Claude Code exposes `Task` with `subagent_type`; Codex exposes Codex-style subagents. Do not use shell process names, installed CLIs, or environment variables as authority for model selection.
3. For the phase's `tier`, use the model named for that harness and tier, but only if its exact string appears in the live allowed-model list.
4. If that model is not allowed, omit `model`. Never translate, abbreviate, or borrow a model name from another harness.

Shell probes are useful only for a human sanity check, not for dispatch. A `cursor-agent` parent process, `claude` binary, or `CODEX_*` environment variable does not prove which `model` values the current Task tool accepts.

Tier intent:

1. `fast`: default normal implementation after planning, narrow low-risk edits, simple docs, small test-only changes.
2. `balanced`: implementation phases with moderate ambiguity, integration, or debugging.
3. `frontier`: ambiguous architecture, cross-cutting changes, hard debugging, security-sensitive work, or phases where a wrong solution is expensive.

For the current harness and the phase's `tier`, use the model named in [model-policy](../model-policy/SKILL.md) if its exact string is in the live allowed-model list; else omit `model`. For `opencode` or any unknown harness, omit `model` and inherit the parent default. Concrete model names and the `tier → model` table live in the policy file — update them there, not here.

Phases are expected to be `tier: fast` by default; a `frontier` phase is a planner signal that ambiguity remains. Pass `reasoning_effort` only when the chosen `model` supports it; when support is unclear in any harness, omit it.

## Dispatch protocol

1. Walk phases in dependency order. A phase is ready when all its `depends_on` are SUCCESS.
2. For each ready phase:
   1. If `agent: Main`, execute locally.
   2. Otherwise, build the sub-agent prompt from the template below and dispatch via the Task tool **for this phase only**:
      - Set `subagent_type` to the phase's `agent` (`implementor` for normal implementation phases).
      - Set `model` only through the [Model selection](#model-selection) rules above; omit `model` when there is no exact allowed match.
      - Do **not** pass `model` based on habit, prior phases, shell/process detection, or slugs from another harness.
      - Wait for the phase to return and pass its verify gate before dispatching the next phase.
3. Parallel rule: phases that list each other in `parallel_with` MUST be dispatched in a single message with one sub-agent call per phase. Sequential phases dispatch one at a time and wait.
4. Anti-patterns (refuse and execute correctly instead):
   1. One Task whose prompt lists phases 1…N or says "run implement mode for this plan."
   2. Reusing one `developer`/`implementor` sub-agent across multiple phases without re-dispatching per phase YAML.
   3. Hardcoding a `model` slug that does not come from the current phase's `tier` + the current Task tool's allowed model list.
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

    Engineering bar: think before coding; search for and reuse existing code; keep it simple (KISS/YAGNI); don't repeat yourself (DRY); add abstractions only for real, repeated needs (rule of three); write minimal, idiomatic code that mirrors local conventions.

    End your final message with this YAML block and nothing after it:

    ```yaml
    status: SUCCESS | FAILURE | BLOCKED
    files_changed: [<paths>]
    log:
      - "Step N OUTCOME — what happened"
    blockers: []   # required if status != SUCCESS
    ```

## Verify gate (hard)

1. After every TODO in a phase is `[x]`, run every command in the phase's `success_criteria`.
2. If any fails, retry once. On second failure, log FAILURE, stop, surface to the user.
3. If `success_criteria` is missing a lint or test command and the plan's VERIFICATION COMMANDS defines one for the phase's `project`, append it before running. Never substitute another project's commands.
4. Never mark a phase SUCCESS without all `success_criteria` exiting 0.

## Failure policy

When N sibling phases run in parallel and any returns FAILURE/BLOCKED:

1. Wait for all siblings to return.
2. Log all results in AGENT LOG.
3. Stop dispatch on any descendant of a failed phase.
4. Independent unrelated branches may continue only if the user opts in.

## Agent log

Maintain inside the plan file under `## AGENT LOG`. If no plan file exists, create `.ai/plans/<yyyyMMdd>_log_<short_goal>.md`.

Format:

    ## AGENT LOG
    - Phase 1 SUCCESS — <one-line>; files: a.py, b.py
    - Phase 2 FAILURE — <one-line cause>; blockers: <…>

For sub-agent dispatch, fold the sub-agent's `log:` entries under the phase line.

## Front-end work

When the plan is for a front-end app, also apply the visual/structure principles in [reference.md](reference.md#front-end-principles).
