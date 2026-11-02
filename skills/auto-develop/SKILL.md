---
name: auto-develop
description: "Run Buddy's develop flow end to end without the spec approval gate; decide reversible choices and stop only for completion, irreversible or out-of-scope choices, required authorization, no progress, or environment failure."
---

# Auto-develop

Before acting, read and follow [develop](../develop/SKILL.md) and [change size](../develop/change-size.md) for this request, with the approval gate off. Keep develop's run state from the start. Do not activate another Buddy skill outside the `develop` flow. A standing user or project instruction to use Buddy auto-develop selects this skill for `develop` requests.

## Decisions

Record the change-size line first; work spanning more than one area is substantial. Auto-develop never skips required review. Choose the recommended option for every reversible choice. Record each in the spec `DECISION LOG` (or the direct brief) and list them in the final report.

## Stop only when

1. Done: all criteria, required validation, and required review pass (`complete`).
2. A choice is irreversible or exceeds the request: scope growth, breaking public contract or API, security, permission, or trust-boundary change, data or schema migration, loss of user work (`awaiting_user`).
3. An action needs explicit authorization under user or repository rules: push, publish, release, PR, message, deleting or overwriting user work, history rewrite, dependency removal or downgrade, lockfile regeneration, changes outside the repository or to shared services, bypassing checks or signing (`awaiting_user`).
4. No progress: a failure repeats without new evidence, a review round closes nothing, or five review rounds pass (`blocked`).
5. The environment cannot continue: missing credentials or services, permission or policy denial, the destructive-command guard, usage limits, unrecoverable harness error (`blocked`).
6. The user interrupts (`awaiting_user`).

Never push, publish, or open a PR on your own.
