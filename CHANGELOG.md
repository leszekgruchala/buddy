# Changelog

## Unreleased

Approve the plan once and let Buddy finish the work.

- `research` no longer stops at the first plausible answer. It tests the premise of your request, traces claims to primary evidence, tries to disprove its answer, and tries other angles before it reports an unknown.
- `innovate` starts from the problem instead of the first idea, and recommends the option that best fits the evidence. `spec` now shows the best viable options for each material choice and why one won.
- `develop` and `auto-develop` check research and options before they write a spec, and run at most two more targeted rounds per run when they find a gap. Small work stays light. `auto-develop` also verifies what would overturn each option it picks, and stops when the evidence shows that the requested outcome would not solve the real problem.
- Pass an existing spec to `develop` or `auto-develop` and Buddy goes straight to implementation, validation, and review, without research or a new approval stop.
- `develop` stops once for spec approval, then implements, validates, reviews, and fixes until the work passes, without more prompts.
- New `auto-develop` skill runs the same flow without the approval stop. It makes reversible choices itself, reports them, and stops only for a real decision, a required permission, no progress, or a failure.
- A new hook continues an active Buddy run when your coding tool stops early, in Claude Code, Codex, and Cursor. Codex users must trust Buddy's hooks again after updating.
- Prevention rules now reach `.ai/memory/memory.md` after a re-review confirms a fix. Buddy shows each rule it saves, and worktrees of a repository share the same rules.
- Fixes rerun only the checks they affect. Remediation allows up to five review rounds while each round makes progress.
- The main agent does the work itself and starts subagents only when they help: fresh review, independent parallel work, large searches, or bulk work for a cheaper model.
- A run that is marked done before its required review is sent back to finish the review.
- Buddy updates its run state with a shell command and in the same turn as its last change, so your editor's last-turn diff shows the work, not Buddy's bookkeeping file.
- `code-reviewer` is now Buddy's only named subagent. When research, innovation, or implementation runs in a subagent, Buddy uses an ordinary subagent that loads the matching skill, in Claude Code, Codex, and Cursor alike. The `test-runner` skill stays.
- Buddy writes its notes to `.ai/` in your project, never in the plugin's own folder.
- The Buddy mod in Claude Code now tracks `auto-develop` runs and shows ordinary subagents working on a Buddy stage.

## 2.6.2 - 2026-10-18

Buddy keeps testing focused on distinct uncovered failures.

- Reuses or extends existing tests, with new cases for meaningful boundaries and partial failures.
- Reuses valid passing checks across agents and verification stages; reruns checks when relevant changes invalidate them.

## 2.6.1 - 2026-10-17

`develop` now scales planning, review, and verification to the size and risk of each change. Small text edits can stay direct, narrow behavior changes get a focused implementation and balanced review, and substantial work keeps the full workflow. Requests for a quick fix or no review also skip review and subagents for that request. This keeps simple work moving while preserving deeper checks where they matter.
