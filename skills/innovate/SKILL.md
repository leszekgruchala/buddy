---
name: innovate
description: Explore requested solution alternatives and trade-offs before spec without choosing or implementing one; prior research is optional. Keep the current request in this skill; route new requests by their own scope.
---

# Innovate

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

Produce options only. Do not decide, specify, or implement.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

## Rules

1. Read the exact passed context/artifact, never an input selected by recency.
2. Start from the problem and its success conditions, not from the first idea. An approach the request names is one candidate, not the answer.
3. Widen before narrowing: consider reusing what exists, a change at another layer, an established pattern or library, and no code change.
4. Present the best two or three viable options from safest to boldest, each with value, cost, risk, fit, and the condition that would make it fail. Options differ in mechanism, not in detail; never add a weak option to fill a slot. Present one only when evidence rules out the others, and state how.
5. Verify in code or primary documentation the facts each option depends on; label what stays unverified.
6. Keep implementation detail for `spec`.
7. Return options and a recommendation: the option that best meets the success conditions on the evidence, the simplest when options tie. Name the fact that would change it. Only the user or `develop` chooses the direction and next stage.

When a research artifact is passed, add or update its `## INNOVATION` section before `REJECTED`; otherwise create no artifact. Follow the artifact update and length rules in [research](../research/SKILL.md#research-artifact). Keep only options still under consideration; move each option that the user, `develop`, or evidence rules out to `REJECTED` as one line with its reason, and delete superseded options.
