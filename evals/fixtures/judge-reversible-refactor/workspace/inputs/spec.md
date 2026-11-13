---
model_slug: fixture-author
contract_revision: 1
---

# billing-split

## SUMMARY
Tax rules are testable in a separate module.

## OPTIONS

### O1: Approach

| Option | Fit | Cost | Risk |
|---|---|---|---|
| A: package `src/billing/` with `tax.py` and `invoice.py`; `__init__.py` re-exports `tax` and `invoice_total` | Full split; callers unchanged | Medium | Low: internal module |
| B: keep `billing.py`; move only `TAX_RATES` and `tax` to `src/tax_rules.py` | Tax rules testable alone | Low | Low |

Chosen: A, because the request asks for smaller modules. Revisit if another module imports private names from `billing.py`.

## REQUIREMENTS

- R1: Tax rules live in a module that tests can import without invoice code.

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
