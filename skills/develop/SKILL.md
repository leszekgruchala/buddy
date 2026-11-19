---
name: develop
description: "Develop end-to-end changes needing decisions, multiple files/projects, risk management, or delegable phases through research, optional innovation, spec, an independent judge when the spec has a choice or an irreversible-change signal, implementation, validation, independent review, and remediation; ask the user only for an unrequested irreversible breaking change or a request that no option can meet within its constraints."
---

# Develop

Own routing, integration, user communication, and run state. Workers run one bounded stage or phase, then return without self-promotion.

Resolve `.ai/` paths from the user's workspace root (its git root), never from the skill or plugin directory.

## Route

First apply [change size](change-size.md). Record the size line before any other step and honor request-specific step overrides before selecting stages.

When every option breaks a constraint, the host asks the user: write the spec with the standard `OPTIONS` entry that ends `Chosen: none. Best pick: <option>.`, set `awaiting_user`, and ask one question that names the constraint each option breaks and your best pick. Do not ask about any other choice; the [judge](#judge) rules on hard choices between viable options.

A spec that the request passes or names is already researched and approved: reuse its worklog and start at `implement`, without `research`, `innovate`, `spec`, the depth gate, the judge, or an approval stop. Never select a spec by recency. Return to `spec` only to amend a material choice that the spec leaves open or that implementation invalidates, with `research` on that gap alone. A material choice found during implementation is such an amendment, and the [judge](#judge) rules on it.

1. `research` when the cause, current behavior, constraints, or solution space are not already verified.
2. `innovate` for substantial work when more than one approach could work and the choice matters, or for small work when two approaches differ materially in cost or risk. Skip it when evidence leaves one viable approach or the user fixed the approach; an obvious-looking option is not a reason.
3. `spec` when goal, requirements, acceptance, scope, approach, constraints, or phase boundaries are unsettled. Before saving it, check in code or primary documentation the `Revisit if` fact of each `OPTIONS` entry that is still unverified.
4. `judge` after a spec is saved or amended, when the spec has a choice or an irreversible-change signal, under [Judge](#judge). Recording rulings, the skip line, and the amendment at the end of the evidence budget do not start another judge.
5. `implement` from a decision-complete spec, or directly for narrow settled work.
6. `review-code` after implementation validation only when the size policy or user requires it. Failed or unavailable validation does not waive required review.

Skip uninformative stages, but never the non-trivial-work spec sufficiency gate.

## Depth gate

Apply before writing a spec for substantial work, or for small work with two approaches that differ materially in cost or risk. The host reads the artifact and spot-checks only the findings that decide the approach. Pass only when:

1. The premise is tested and the real problem, not only its symptom, is identified.
2. Every finding that decides the approach rests on primary evidence.
3. The best viable options are known and compared against the outcome, including any approach the request named.
4. Each remaining unknown cannot change the choice, or the attempts recorded for it failed.

On a gap, run one targeted `research` or `innovate` round that batches every open gap, from a different angle. Allow at most two extra rounds per run, and end the loop after a round that adds no new evidence. Research for a spec amendment and the judge's evidence rounds use the same budget. Record what stays open as an assumption in spec `RISKS` and name it in the final report. When evidence shows that the requested outcome would not solve the real problem, do not ask: add an `OPTIONS` entry that compares the requested outcome with the real-problem fix, and let the judge rule on it.

## Judge

The judge takes the place of a spec approval stop. Do not stop for approval after saving or amending `spec_<work-name>.md`.

1. Scan the spec for the irreversible-change signals that [judge](../judge/SKILL.md#procedure) lists, and count its `OPTIONS` entries that compare more than one option. An entry where every option breaks a constraint goes to the user under [Route](#route), and a one-line entry that names the only viable option does not count. When there is no such entry and no signal, the judge has nothing to rule on: start no judge, record `Judge: skipped, no choices or signals` in the spec `DECISION LOG` of the saved file (a line only in chat does not count), and continue under step 7 or with `implement`. Otherwise dispatch a fresh judge on `frontier` under [model selection](model-selection.md): the `judge` agent on Claude Code and Cursor, or a generic worker that loads Buddy `judge` on Codex. Pass the user's request word for word, repository and user instructions, explicit user constraints, the spec path, the research and innovation artifact paths, the signals, and the number of evidence rounds left. Do not pass your conversation or your preferred options.
2. On `OVERTURN` or `NEEDS_EVIDENCE`, run one targeted `research` round for the named gaps when there are any, amend the spec, and dispatch a new fresh judge. These rounds use the depth gate's budget. When the budget ends, the latest verdicts and provisional picks stand: amend the spec to match them without another judge call.
3. Record each ruling in the spec: in the `OPTIONS` entry's `Chosen` line, marked `(judge)`, or in `DECISION LOG` for signals and minor choices. Without a spec, record it in the final report.
4. Check each `ASK_USER` verdict mechanically against the judge skill's fields for its `kind`: every required field is present, `category` is one of its four values for an irreversible change, `broken_constraints` names each option for a constraint conflict, and each cited repository path exists. On a failed check, dispatch one fresh judge with the check error. If that verdict also fails, or judge dispatch is unavailable, summarize outcome, options with the chosen one, decisions, open assumptions, phases, and verification, set `awaiting_user`, and stop for one approval.
5. For a valid `ASK_USER`, set `awaiting_user` and ask one question with the judge's best pick. For an irreversible change, state the change, its category, and why it is irreversible. For a constraint conflict, state the constraint that each option breaks.
6. Before you write `complete`, scan the integrated diff for the same signals. A signal that a passed spec or the request already covers needs no ruling. For any other signal that no ruling covers, dispatch a fresh judge with zero evidence rounds left and that signal as its only item to rule on: amend the spec first when the run has one, and pass the diff instead when it has none. This call does not use the depth gate's budget. After an `OVERTURN`, return to `implement` for the affected change, then revalidate and re-review under the size policy.
7. When the request asks to stop for spec approval, run the judge first when step 1 starts one, then stop for one approval with its rulings in the summary. When step 1 skips the judge, write its skip line into the spec before the stop; the summary has no rulings and repeats that line.
8. When the request disables subagent dispatch, apply the judge skill on the host for every judge call in this section and label the rulings host-judged.
9. The judge never decides a test deletion, an action that needs authorization, or a change to an explicit user constraint.

## Continuity

This orchestrator owns transitions for the whole request, including after `spec`'s internal hard stop. Stage skills it loads on the host are procedures; their stop, ask, and routing rules apply only when the user calls them directly.

Before you run a stage on the host, read its `SKILL.md` in full and follow it. Before the first product or test edit, read [implement](../implement/SKILL.md); its test changes rules and verify gates apply to every edit in the run. A stage whose skill file you did not read has not run.

1. Run to completion without prompts. Stop only when:
   1. Done: all criteria, required validation, and required review pass (`complete`).
   2. The judge asks the user; every option breaks a constraint; the judge's approval fallback applies; or the request asks to stop for spec approval (`awaiting_user`, never `complete`).
   3. An action needs explicit authorization under user or repository rules: push, publish, release, PR, message, deleting or overwriting user work, history rewrite, dependency removal or downgrade, lockfile regeneration, changes outside the repository or to shared services, bypassing checks or signing, or a test deletion that only the user can authorize (`awaiting_user`).
   4. No progress: a failure repeats without new evidence, a review round closes nothing, or five review rounds pass (`blocked`).
   5. The environment cannot continue: missing credentials or services, permission or policy denial, the destructive-command guard, usage limits, or an unrecoverable harness error (`blocked`).
   6. The user interrupts (`awaiting_user`).
2. Ask once; never re-ask settled points. Never push, publish, or open a PR on your own.
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
3. Run phases on the host, in order, by default; phases remain verification and resume units. Dispatch a worker only when the size policy permits it and at least one holds: the judge; required independent review; `parallel_with` phases large enough that concurrency saves time; work that reads far more than it returns; bulk mechanical work a cheaper model does equally well. Never dispatch work that needs most of the host's context or whose result must be integrated immediately.
4. Run parallel phases together only when persisted phase records give disjoint mutation ownership, there is no dependency, and there is no shared mutable state.
5. Do not start harness-native orchestration (dynamic workflows, ultracode, agent teams) inside a Buddy run.
6. Apply [model selection](model-selection.md) to host reasoning and every worker. Preserve phase instructions and ownership; pass verified author provenance to research and spec workers.
7. Workers are ordinary general-purpose subagents, except the judge ([Judge](#judge)) and the required reviewer (Validation 3). Each brief tells the worker to load Buddy `<skill>` for this one stage, ignore that skill's stop and routing rules, return to the host, and return `BLOCKED` without editing if the skill cannot be loaded. It adds the host's instructions, the result shape, and the goal or success criteria when any exist; a phase brief always includes the phase outcome. A `research` or `innovate` brief gives the user's outcome and marks the request's assumptions as claims to test. Assign one bounded stage/phase per worker, never the whole workflow; wait for all workers before integration.
8. On Cursor, follow `implement`'s Host Goal for who creates the native Goal. Never respawn or interrupt a worker over a Goal.

## Validation

1. Establish a baseline before implementation when practical.
2. Apply `implement`'s phase and final verify gates, including whole-spec acceptance, against the integrated current revision.
3. Run validation required by the size policy and repository. When review is required, select a model under `review-code` and dispatch a fresh independent reviewer with request, size, effective brief, resolved model/effort, repository instructions, diff, and validation evidence, including the path of any `test-changes.md`. The reviewer returns findings directly and creates no review file unless the user explicitly requested one. In Codex, use a fresh reviewer role, never a shared-agent plugin path; Claude Code/Cursor may use `code-reviewer`.
4. Loop without prompting: fix every `Open` finding through `implement`, then revalidate and re-review under the size policy. Pass each re-reviewer the latest findings table. Each round must close at least one finding or add concrete evidence; otherwise stop as blocked.
5. Complete only when required validation and review pass, and every actionable finding is fixed or disproved. Never write `complete` or report done before a required review has run. The host may confirm Low-only fixes for small work; label them host-verified. Prevention promotion requires the reviewer's fresh confirming review.
6. Leave failed-phase continuation to the active `implement` host's failure-only bounded continuation policy. Apply the size policy to review of returned changes even while implementation remains blocked.
7. Report only the outcome, changed files, validation, the path of any `test-changes.md`, actionable review findings, promoted or unsaved prevention rules, each judge ruling with its pick and `Revisit if` fact or `Judge: skipped, no choices or signals`, each question asked, open assumptions, and blockers.
