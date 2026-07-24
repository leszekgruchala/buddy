---
name: innovate
description: Explore a small set of meaningfully different solution directions and trade-offs without selecting or implementing one. Use when the user or develop explicitly requests alternatives before plan or spec; prior research is optional.
---

# Innovate

Produce options only. Do not decide, plan, or implement. Do not activate another Buddy skill.

## Rules

1. Read the exact passed context or artifact; never select an input by recency.
2. Present one to three distinct options from safest to boldest.
3. For each option, state value, cost, risk, and when it fits.
4. Avoid implementation detail that belongs in `spec`.
5. Return the options and a simplest-viable recommendation. Do not invent the next stage — the caller (user or `develop` orchestrator) chooses direction and what follows.
6. Use `frontier`; resolve dispatch overrides through [model-policy](../model-policy/SKILL.md).

If a passed research artifact contains `## INNOVATION`, update that section. Otherwise return the options without creating another artifact.
