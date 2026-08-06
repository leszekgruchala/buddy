---
name: innovate
description: Explore meaningfully different solution directions and trade-offs without selecting or implementing one. Use when the user or develop requests alternatives before spec; prior research is optional. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Innovate

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Produce options only. Do not decide, specify, or implement.

## Rules

1. Read the exact passed context or artifact; never select an input by recency.
2. Present one to three distinct options from safest to boldest.
3. For each option, state value, cost, risk, and when it fits.
4. Avoid implementation detail that belongs in `spec`.
5. Return options and a simplest-viable recommendation; only the user or `develop` chooses the direction and next stage.
6. Caller tier: `frontier`.

Update `## INNOVATION` only when present in a passed research artifact; otherwise create no artifact.
