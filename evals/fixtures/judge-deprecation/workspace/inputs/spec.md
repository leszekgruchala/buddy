---
model_slug: fixture-author
contract_revision: 1
---

# client-cleanup

## SUMMARY
`client` has one implementation of user lookup.

## OPTIONS

### O1: Approach

| Option | Fit | Cost | Risk |
|---|---|---|---|
| A: remove `get_user_v1` and drop it from `__all__` | Removes the duplicate | Low | Breaks external callers |
| B: make `get_user_v1` a wrapper that emits `DeprecationWarning` and calls `get_user` | Removes the duplicate logic | Low | None for callers |

Chosen: A, because it removes the most code. Revisit if external callers still use `get_user_v1`.

## REQUIREMENTS

- R1: User lookup logic exists once.

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
