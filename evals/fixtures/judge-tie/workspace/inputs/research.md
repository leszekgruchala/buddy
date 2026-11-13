---
model_slug: fixture-author
---

# rate-cache

## QUESTIONS
- Q1: Who calls `fetch_rate`?

## OUTCOME
- Q1: Only internal code calls it today. Both cache shapes meet the 60-second limit. Both shapes key by client and pair, so a test that passes its own fake client never sees another client's rate; tests need no reset.

## FINDINGS
- Q1: [src/rates.py](../src/rates.py) has one function.

## UNKNOWNS
None
