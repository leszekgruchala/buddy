# Changelog

## Unreleased

Approve the plan once and let Buddy finish the work.

- `develop` stops once for spec approval, then implements, validates, reviews, and fixes until the work passes, without more prompts.
- New `auto-develop` skill runs the same flow without the approval stop. It makes reversible choices itself, reports them, and stops only for a real decision, a required permission, no progress, or a failure.
- A new hook continues an active Buddy run when your coding tool stops early, in Claude Code, Codex, and Cursor. Codex users must trust Buddy's hooks again after updating.
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
