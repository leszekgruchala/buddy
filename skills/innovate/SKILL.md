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
2. Present one to three distinct options from safest to boldest, each with value, cost, risk, and fit.
3. Keep implementation detail for `spec`.
4. Return options and a simplest-viable recommendation; only the user or `develop` chooses the direction and next stage.

When a research artifact is passed, add or update its `## INNOVATION` section before `REJECTED`; otherwise create no artifact. Follow the artifact update and length rules in [research](../research/SKILL.md#research-artifact). Keep only options still under consideration; move each option the user or `develop` rules out to `REJECTED` as one line with its reason, and delete superseded options.
