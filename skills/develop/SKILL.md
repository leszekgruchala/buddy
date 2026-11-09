---
name: develop
description: "Develop end-to-end changes needing decisions, multiple files/projects, risk management, or delegable phases through research, optional innovation, spec, implementation, validation, independent review, and remediation."
---

# Develop

Own routing, integration, user communication, and run state. Workers run one bounded stage or phase, then return without self-promotion.

Resolve `.ai/` paths from the user's workspace root (its git root), never from the skill or plugin directory.

## Route

First apply [change size](change-size.md). Record the size and honor request-specific step overrides before selecting stages.

A spec that the request passes or names is already researched and approved: reuse its worklog and start at `implement`, without `research`, `innovate`, `spec`, the depth gate, or an approval stop. Never select a spec by recency. Return to `spec` only to amend a material choice that the spec leaves open or that implementation invalidates, with `research` on that gap alone.

1. `research` when the cause, current behavior, constraints, or solution space are not already verified.
2. `innovate` for substantial work when more than one approach could work and the choice matters, or for small work when two approaches differ materially in cost or risk. Skip it when evidence leaves one viable approach or the user fixed the approach; an obvious-looking option is not a reason.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or phase boundaries are unsettled.
4. `implement` from a decision-complete spec, or directly for narrow settled work.
5. `review-code` after implementation validation only when the size policy or user requires it. Failed or unavailable validation does not waive required review.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Depth gate

Apply before writing a spec for substantial work, or for small work with two approaches that differ materially in cost or risk. The host reads the artifact and spot-checks only the findings that decide the approach. Pass only when:

1. The premise is tested and the real problem, not only its symptom, is identified.
2. Every finding that decides the approach rests on primary evidence.
3. The best viable options are known and compared against the outcome, including any approach the request named.
4. Each remaining unknown cannot change the choice, or the attempts recorded for it failed.

On a gap, run one targeted `research` or `innovate` round that batches every open gap, from a different angle. Allow at most two extra rounds per run, and end the loop after a round that adds no new evidence. Research for a spec amendment and a refuted auto-develop choice use the same budget. Record what stays open as an assumption in spec `RISKS` and name it in the approval summary. When evidence shows that the requested outcome would not solve the real problem, ask before `spec`.

## Continuity

This orchestrator, also when `auto-develop` runs it, owns transitions for the whole request, including after `spec`'s internal hard stop. Stage skills it loads on the host are procedures; their stop and routing rules apply only when the user calls them directly.

Before you run a stage on the host, read its `SKILL.md` in full and follow it. Before the first product or test edit, read [implement](../implement/SKILL.md); its test changes rules and verify gates apply to every edit in the run. A stage whose skill file you did not read has not run.

1. Approval gate: after saving or amending `spec_<work-name>.md`, summarize outcome, options with the chosen one, decisions, open assumptions, phases, and verification, set `awaiting_user`, and stop for one approval. Direct work without a spec has no gate. `auto-develop` skips it.
2. After approval, run to completion without further prompts. Pause only for an unresolved material product/architecture choice, required user selection, or a test deletion that only the user can authorize. Ask once; never re-ask settled points.
3. Select the next stage under the current unfinished request's authority. After completion, route each new request by its own size.

## Run state

Keep `.ai/worklog/<yyyyMMdd>_<work-name>/run-state.json` current from the first stage to the end: `{"status": "running" | "awaiting_user" | "blocked" | "complete", "next": "<next concrete step>", "seq": <int>, "review": "required" | "passed"}`. Increment `seq` on every update. Set `review` to `required` once the size policy requires review, and to `passed` only after it passes; omit it otherwise. Write `awaiting_user` before asking the user or answering an interrupt or unrelated message, `blocked` before reporting a blocker, and `complete` at the end. Before you write `complete`, confirm that `test-changes.md` exists and has every field of `implement`'s template when the diff adds, edits, or deletes a test. Write `complete`, and `review: passed` when review was required, in the turn that makes the last change; do not end a finished turn as `running`. Only the host writes it. Write the whole file with one shell command that names its path literally, such as `cat > <run-dir>/run-state.json <<'EOF'`, not with the file-edit tool, so that editor turn diffs show only the work. A Buddy Stop hook continues the session while the status is `running`, or `complete` with `review` still `required`.

## Worklog

Create one `.ai/worklog/<yyyyMMdd>_<work-name>/` per run; pass its exact path and `work-name` throughout. It always holds `run-state.json`; other artifacts only when their stage produces them:

- `research_<work-name>.md`
- `spec_<work-name>.md`
- `test-changes.md`, when the change adds, edits, or deletes a test
- `trash/`

## Dispatch

1. Main owns decisions, communication, and routing. Researchers supply facts; bounded `spec` workers may reason and author the artifact.
2. The `implement` host materializes each effective brief.
3. Run phases on the host, in order, by default; phases remain verification and resume units. Dispatch a worker only when the size policy permits it and at least one holds: required independent review; `parallel_with` phases large enough that concurrency saves time; work that reads far more than it returns; bulk mechanical work a cheaper model does equally well. Never dispatch work that needs most of the host's context or whose result must be integrated immediately.
4. Run parallel phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state.
5. Do not start harness-native orchestration (dynamic workflows, ultracode, agent teams) inside a Buddy run.
6. Apply [model selection](model-selection.md) to host reasoning and every worker. Preserve phase instructions and ownership; pass verified author provenance to research and spec workers.
7. Workers are ordinary general-purpose subagents, except the required reviewer (Validation 3). Each brief tells the worker to load Buddy `<skill>` for this one stage, ignore that skill's stop and routing rules, return to the host, and return `BLOCKED` without editing if the skill cannot be loaded. It adds the host's instructions, the result shape, and the goal or success criteria when any exist; a phase brief always includes the phase outcome. A `research` or `innovate` brief gives the user's outcome and marks the request's assumptions as claims to test. Assign one bounded stage/phase per worker, never the whole workflow; wait for all workers before integration.
8. On Cursor, follow `implement`'s Host Goal for who creates the native Goal. Never respawn or interrupt a worker over a Goal.

## Validation

1. Establish a baseline before implementation when practical.
2. Apply `implement`'s phase and final verify gates, including whole-spec acceptance, against the integrated current revision.
3. Run validation required by the size policy and repository. When review is required, select a model under `review-code` and dispatch a fresh independent reviewer with request, size, effective brief, resolved model/effort, repository instructions, diff, and validation evidence, including the path of any `test-changes.md`. The reviewer returns findings directly and creates no review file unless the user explicitly requested one. In Codex, use a fresh reviewer role, never a shared-agent plugin path; Claude Code/Cursor may use `code-reviewer`.
4. Loop without prompting: fix every `Open` finding through `implement`, then revalidate and re-review under the size policy. Pass each re-reviewer the latest findings table. Each round must close at least one finding or add concrete evidence; otherwise stop as blocked.
5. Complete only when required validation and review pass, and every actionable finding is fixed or disproved. Never write `complete` or report done before a required review has run. The host may confirm Low-only fixes for small work; label them host-verified. Prevention promotion requires the reviewer's fresh confirming review.
6. Leave failed-phase continuation to the active `implement` host's failure-only bounded continuation policy. Apply the size policy to review of returned changes even while implementation remains blocked.
7. Report only the outcome, changed files, validation, the path of any `test-changes.md`, actionable review findings, promoted or unsaved prevention rules, auto-develop decisions, and blockers.
