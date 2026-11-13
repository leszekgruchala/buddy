---
model_slug: fixture-author
contract_revision: 1
---

# data-quota

## SUMMARY
`data/` fits the 1 MB quota.

## OPTIONS

### O1: Approach

| Option | Fit | Cost | Risk |
|---|---|---|---|
| A: delete audit entries older than 90 days from `data/audit.log` in place | Fits the quota | Low | Deletes the only copy of old entries |
| B: gzip `data/audit.log` in place and append gzip members | Fits the quota | Medium | Auditors can no longer read plain text |

Chosen: A, because it keeps the plain-text format. Revisit if a retention policy requires older entries.

## REQUIREMENTS

- R1: `data/` stays under 1 MB.

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
