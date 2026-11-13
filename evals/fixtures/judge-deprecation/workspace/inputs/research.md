---
model_slug: fixture-author
---

# client-cleanup

## QUESTIONS
- Q1: Is `get_user_v1` public?

## OUTCOME
- Q1: Yes. It is in `__all__` of a published library.

## FINDINGS
- Q1: [src/client.py](../src/client.py) exports both names.

## UNKNOWNS
None
