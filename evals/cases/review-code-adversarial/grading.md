# Adversarial review grading

Keep this file and the oracle tests outside both review workspaces. Reviewers receive
only the fixture workspace, the review skill bundle, and the case prompt.

## Seeded defects

1. D1: `ShippingService.preview` keys the shared cache by order ID alone. Preview tenant
   A's order, then tenant B's order with the same ID. B receives A's destination despite
   passing tenant authorization. Use the tenant and order ID as the cache key.
2. D2: `ShippingService.submit` uses a truthy default for the limit. A zero limit becomes
   10 and permits a disabled tenant to ship. Default only when the value is absent/None.
3. D3: Shipment acceptance precedes the status write without a gateway idempotency key.
   Fail the status write, then retry. The gateway accepts a second shipment. Use a stable
   tenant/order key; moving the write first alone does not preserve the contract.

Award one detection per distinct cause only when the finding states the reachable trigger,
observable failure, and relevant location. Report recall as detected/3. Do not award extra
credit for severity, formatting, multiple symptoms, or a missing-test row for the same bug.

## Safe lookalikes and false positives

1. S1: Internal methods lack their own principal check. The sole external route performs
   authorization first; do not report an authorization bypass without a reachable path.
2. S2: Internal submit lacks positive-integer validation. The route rejects zero, negative,
   boolean, and non-integer units. Direct internal calls are outside the stated contract.
3. S3: There is no lock or durable cache. Requests are sequential, orders immutable, and
   restarts excluded. Do not invent concurrent or mutable-order failures.

Count unsupported defect claims separately as false positives. Assess unexpected findings
against the contract; do not reject a genuine fourth defect merely because it is unseeded.
Score output/lifecycle compliance separately from detection and false positives.

## Comparison

Use Buddy v2.0.0 as the baseline for this later evaluation. Preserve the original
`review-code-explicit` no-Buddy pilot unchanged. Match fixture, prompt, model, reasoning
effort, permissions, tools, and output schema. Only review skill provisioning differs.
Record revision hashes, exact prompt, raw final responses, and scoring. One paired run is
a smoke check, not evidence of superior general recall. Follow with real missed-bug diffs
and repeated runs before claiming a measured improvement.
