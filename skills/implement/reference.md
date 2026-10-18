# implement reference

## Deviation boundary

Stop and return to the active host when:

1. The phase needs work outside its persisted mutation ownership or across a protected boundary.
2. Requirements conflict with each other or a settled decision.
3. A criterion needs a changed decision, broader external effect, or another owner's work.
4. A worker returns `BLOCKED`.

Otherwise proceed autonomously.

## Execution discretion

Use the effective brief: current shared contract plus one phase delta, resolving requirements, success criteria, verification entries that name those criteria, boundaries, and mutation ownership for every tier. Fast follows provided deterministic anchors/procedures. Balanced may form a disposable runtime plan and choose files, decomposition, technique, and tests inside the contract; frontier may also choose technical architecture/algorithms within settled product/public-architecture boundaries. Never persist plans or raw transcripts. Report contract-amending discoveries; recheck evidence affected by later writes against the integrated current revision.

## Engineering contract

Apply this to every changed line; conflicting repository guidance wins.

### Decide

1. Preserve correctness, security, requirements, and existing behavior before design optimization.
2. Inspect neighboring code/conventions first. Reuse in order: project capability; standard library/framework; approved dependency; new local code; new dependency.
3. Minimize cognitive load, coupling, mutable state, public surface, and operational risk; line count alone is not simplicity.
4. Add no speculative features, configuration, extension points, or optimization.

### Abstract and reuse

1. Abstract shared concepts, invariants, or reasons for change, not syntax. Require a domain concept, invariant, unstable boundary, useful test seam, or substantial duplication among consumers that evolve together.
2. Avoid pass-through wrappers, single-use indirection, hypothetical interfaces, and generic machinery driven by unrelated flags/callbacks.
3. Direct dependencies toward stable domain logic; prefer composition and small explicit units over inheritance or framework-shaped business logic.

### Implement safely

1. Make invalid states hard to represent; prefer immutable data, explicit flow, narrow visibility, and boundary side effects.
2. Use semantic types for identity, units, invariants, or closed sets to prevent invalid primitive interchange; never wrap incidental locals without domain meaning/invariants.
3. Validate untrusted data once and construct domain types at trust boundaries; avoid redundant internal checks.
4. Recover only with meaningful action/context; otherwise propagate, preserve causes, and never silently swallow failures.
5. Make relevant resource ownership/cleanup, transactions, cancellation, timeouts, retries, and idempotency explicit.
6. Bound inputs, collections, queues, concurrency, and retries; non-idempotent retries need a strategy.
7. Preserve compatibility unless the spec authorizes a break. Keep logs actionable and free of sensitive data.
8. Optimize from evidence; avoid obviously unsuitable algorithms/data structures.

### Verify

1. Inspect existing coverage; reuse or extend behavioral tests. Add cases only for distinct realistic uncovered failures. Zero additions is valid.
2. Where practical, prove regressions fail before the fix and pass after. Prioritize relevant consequential boundaries and partial failures; avoid generic case checklists.
3. Share fixtures and parameterize equivalent cases; separate distinct failure causes. Assert behavior, not framework guarantees, internals, prose, or styling unless contractual.
4. Run repository-defined checks under the [validation policy](../develop/change-size.md#validate-and-review); invent no substitutes.
5. Check the diff for scope creep, compatibility, security, dead code, complexity, and change-created duplicate assertions.
6. Disclose unrun checks; never imply they passed.

## Front-end principles

For front-end code:

1. Reuse: componentize repeated UI patterns.
2. Consistency: one design system (color tokens, typography, spacing).
3. Simplicity: small focused components; no needless styling complexity.
4. Demo orientation: support quick prototyping (streaming, multi-turn, tools).
5. Visual quality: hold spacing, padding, and hover states to a high bar.
