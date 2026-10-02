# Short Outcome Examples

These illustrate wording, not verified claims. Use the actual comparison's conditions and citations; omit diagrams when they add no explanation.

| Change | Before | After | Impact |
| --- | --- | --- | --- |
| Expiry boundary fix | A session is accepted at its exact expiry time. | A session is rejected at or after expiry. | Users with an expired session must sign in again; valid sessions behave as before. |
| Search wording | The empty state says “Nothing here.” | It says “No matches. Try a shorter search.” | People with no matching results get a specific next step; search behavior is unchanged. |
| Breaking export contract | Clients read the CSV column `user_id`. | The column is named `account_id`. | Export consumers must update their column lookup before using the new CSV. |
| Documentation and tests | The interval units are undocumented and the example is untested. | The guide states seconds and a test covers the example. | Integrators can select the intended interval; runtime behavior is unchanged. |

For incomplete evidence, state the limit rather than writing a confident benefit: “The candidate accepts an optional region; the previous implementation and affected callers are unavailable, so compatibility is unverified.” Put that gap in a warning above the comparison. A description of an intended outcome does not prove that outcome works.
