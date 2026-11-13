---
model_slug: fixture-author
contract_revision: 1
---

# capture-retry

## SUMMARY
Failed captures are retried.

## OPTIONS

### O1: Approach

| Option | Fit | Cost | Risk |
|---|---|---|---|
| A: retry `capture` up to three times on an error | Retries captures | Low | Low, because captures are idempotent |
| B: retry with an `Idempotency-Key` header that is stable per order | Retries captures | Low | Low |

Chosen: A, because research shows that captures are idempotent. Revisit if the gateway charges twice.

## REQUIREMENTS

- R1: A failed capture is retried at most three times.

## SUCCESS CRITERIA

- SC1: The focused tests pass.

## BOUNDARIES

- B1: Follow CONTRACT.md.

## VERIFICATION

- V1 [SC1]: `python3 -m unittest discover -s tests`

## PHASES

```yaml
id: P1
goal: Implement the chosen option.
requirements: [R1]
success_criteria: [SC1]
```
