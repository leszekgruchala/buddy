---
model_slug: fixture-author
contract_revision: 1
---

# rate-cache

## SUMMARY
Exchange rates come from a cache of at most 60 seconds.

## OPTIONS

### O1: Approach

| Option | Fit | Cost | Risk |
|---|---|---|---|
| A: `functools.lru_cache` on a private helper keyed by client, pair, and a 60-second time bucket; `fetch_rate` keeps its signature | Meets the limit | Low | Low |
| B: public module-level `RATE_CACHE` dict of `(value, expiry)` keyed by client and pair, plus a public `clear_rates()` function | Meets the limit | Low | Low |

Chosen: B, because an explicit dict makes the expiry visible in one place. Revisit if a caller must not see cache internals.

## REQUIREMENTS

- R1: `fetch_rate` returns a cached rate that is at most 60 seconds old.

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
