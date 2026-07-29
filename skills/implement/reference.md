# implement reference

## Deviation taxonomy

Stop and ask the user if:

1. A file the spec assumed to exist does not.
2. Two requirements contradict each other.
3. Fixing a `success_criteria` failure requires editing outside `files_touched`.
4. An `out_of_scope` change is required to satisfy a TODO.
5. A sub-agent returns `status: BLOCKED`.

Otherwise proceed autonomously.

## Engineering contract

Apply this to every changed line; conflicting repository guidance wins.

### Decide

1. Before optimizing design, preserve correctness, security, requirements, and existing behavior.
2. Inspect neighboring code/conventions first. Reuse in order: existing project capability; standard library/framework; approved dependency; new local code; new dependency.
3. Minimize cognitive load, coupling, mutable state, public surface, and operational risk; fewer lines alone are not simpler.
4. Add no speculative features, configuration, extension points, or optimization.

### Abstract and reuse

1. Abstract shared concepts, invariants, and reasons for change—not repeated syntax; duplication is cheaper than a wrong abstraction.
2. Abstract only to represent a domain concept, enforce an invariant, isolate an unstable boundary, create a useful test seam, or remove substantial duplication among consumers that evolve together.
3. Avoid pass-through wrappers, single-use indirection, hypothetical-implementation interfaces, and generic machinery driven by unrelated flags/callbacks.
4. Direct dependencies toward stable domain logic; prefer composition and small explicit units over inheritance and framework-shaped business logic.

### Implement safely

1. Make invalid states hard to represent; prefer immutable data, explicit flow, narrow visibility, and boundary side effects.
2. Give values semantic types for identity, units, invariants, or closed sets; avoid cross-codebase primitive strings/numbers when a domain type prevents invalid interchange. Do not wrap incidental locals without domain meaning/invariants.
3. Validate untrusted data once at trust boundaries and construct domain types there; avoid redundant internal validation.
4. Recover only to add meaningful action/context; otherwise propagate. Preserve causes; never silently swallow failures.
5. Where relevant, make resource ownership/cleanup, transaction boundaries, cancellation, timeouts, retries, and idempotency explicit.
6. Bound inputs, collections, queues, concurrency, and retries; retry non-idempotent work only with a strategy.
7. Preserve compatibility unless the spec authorizes a break. Keep logs actionable and free of secrets/sensitive data.
8. Optimize from evidence while avoiding obviously unsuitable algorithms/data structures.

### Verify

1. For defects, reproduce before fixing when practical and add a regression test.
2. Test observable behavior: changed success path, realistic boundaries, and relevant failures. Prefer the narrowest valuable test; avoid implementation-coupled tests.
3. Run repository-defined format, lint, type, compile, and test commands; invent no substitutes.
4. Review the final diff for scope creep, accidental compatibility changes, security exposure, dead code, and unnecessary complexity.
5. Report checks that could not run; never imply an unrun check passed.

## Front-end principles

For front-end code:

1. Reuse: componentize repeated UI patterns.
2. Consistency: one design system (color tokens, typography, spacing).
3. Simplicity: small focused components; no needless styling complexity.
4. Demo orientation: support quick prototyping (streaming, multi-turn, tools).
5. Visual quality: hold spacing, padding, and hover states to a high bar.
