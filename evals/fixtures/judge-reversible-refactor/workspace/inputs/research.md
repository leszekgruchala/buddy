---
model_slug: fixture-author
---

# billing-split

## QUESTIONS
- Q1: Who imports `billing`?

## OUTCOME
- Q1: Only `src/app.py` imports `invoice_total`; tests import `tax` and `invoice_total`.

## FINDINGS
- Q1: [src/app.py](../src/app.py) imports `invoice_total`.

## UNKNOWNS
None
