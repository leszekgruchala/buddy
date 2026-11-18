# Changelog

## Unreleased

Describe the outcome and let Buddy finish the work: an independent judge settles the plan and asks you only before an irreversible breaking change or when no option fits your constraints.

- New `write-tests` skill writes unit and integration tests the way a careful maintainer does. It adds one case per distinct behavior, failure, or edge case, extends your existing test helpers and tables when a function gains an argument, skips obvious cases, and keeps consumer-specific cases out of generic modules. `implement` and `develop` follow the same rules, and `review-code` reports added tests that break them.
- `implement` and `develop` no longer delete or rewrite your existing tests unless you ask. When a change edits tests, Buddy reports what the tests now protect and each existing test it changed, and a passing test run alone no longer completes the work. In `develop` runs, `review-code` also reports test deletions and rewrites that you did not ask for. Buddy also checks new test code for consistency with your patterns, shared helpers for repeated setup, and duplicates.
- `research` no longer stops at the first plausible answer. It tests the premise of your request, traces claims to primary evidence, tries to disprove its answer, and tries other angles before it reports an unknown.
- `innovate` starts from the problem instead of the first idea, and recommends the option that best fits the evidence. `spec` now shows the best viable options for each material choice and why one won.
- `develop` checks research and options before it writes a spec, and runs at most two more targeted rounds per run when it finds a gap. Small work stays light. It also verifies what would overturn each option before it saves the spec.
- Pass an existing spec to `develop` and Buddy goes straight to implementation, validation, and review, without research or a new approval stop.
- New `judge` skill and agent: before implementation, `develop` now has an independent judge rule on each spec that has a choice or an irreversible-change risk. A spec with nothing to decide skips the judge and its cost. With a fresh context on a frontier model, the judge checks the facts behind each choice in the spec and confirms it, overturns it, or asks for more evidence. It asks you only for a breaking change that you did not request, that cannot be undone after release, and that has no reversible alternative such as a deprecation or a feature flag, or when every option breaks one of your constraints. In all other cases it decides on the evidence, picks the option that is easiest to undo when the evidence ties, and lists each ruling in the final report. Add `Stop for spec approval.` to a request to approve the spec yourself.
- `develop` then implements, validates, reviews, and fixes until the work passes, without more prompts. It stops only when the work is done, for a judge question (also when no option meets your constraints), for an action that needs your permission, when it makes no progress, or when the environment fails.
- A new hook continues an active Buddy run when your coding tool stops early, in Claude Code, Codex, and Cursor. Codex users must trust Buddy's hooks again after updating.
- Prevention rules now reach `.ai/memory/memory.md` after a re-review confirms a fix. Buddy shows each rule it saves, and worktrees of a repository share the same rules.
- Fixes rerun only the checks they affect. Remediation allows up to five review rounds while each round makes progress.
- The main agent does the work itself and starts subagents only when they help: the judge, fresh review, independent parallel work, large searches, or bulk work for a cheaper model.
- A run that is marked done before its required review is sent back to finish the review.
- Buddy is now open source under the Apache License 2.0. You can use, change, and redistribute it, also commercially. Copies and forks must keep the `NOTICE` file. This replaces the Elastic License 2.0.
- Buddy updates its run state with a shell command and in the same turn as its last change, so your editor's last-turn diff shows the work, not Buddy's bookkeeping file.
- `code-reviewer` and `judge` are now Buddy's only named subagents. When research, innovation, or implementation runs in a subagent, Buddy uses an ordinary subagent that loads the matching skill, in Claude Code, Codex, and Cursor alike. The `test-runner` skill stays.
- Buddy writes its notes to `.ai/` in your project, never in the plugin's own folder.
- The Buddy mod in Claude Code now shows the judge as a worker and shows ordinary subagents working on a Buddy stage.
- The Buddy mod in Claude Code now follows a run back to Implement or Spec after review, when Buddy edits files to fix review findings or reads that stage's skill again, and no longer shows "Quest complete" while that work runs. Fixes made only with shell commands are not visible to the mod.
- The Buddy mod lights up Validate while Buddy runs the spec's final validation phase.
- The Buddy mod's phase count now includes results that Buddy records in the spec with a shell command.
- The Buddy mod no longer repeats the spec phase count in a line under the Claude Desktop card. The card itself shows it.

## 2.6.2 - 2026-10-18

Buddy keeps testing focused on distinct uncovered failures.

- Reuses or extends existing tests, with new cases for meaningful boundaries and partial failures.
- Reuses valid passing checks across agents and verification stages; reruns checks when relevant changes invalidate them.

## 2.6.1 - 2026-10-17

`develop` now scales planning, review, and verification to the size and risk of each change. Small text edits can stay direct, narrow behavior changes get a focused implementation and balanced review, and substantial work keeps the full workflow. Requests for a quick fix or no review also skip review and subagents for that request. This keeps simple work moving while preserving deeper checks where they matter.
