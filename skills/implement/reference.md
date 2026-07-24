# implement reference

## Deviation taxonomy

Stop and ask the user when any of these occur:

1. A file the spec assumed to exist does not.
2. Two requirements contradict each other.
3. A `success_criteria` failure can only be fixed by editing files outside `files_touched`.
4. An `out_of_scope` change is required to satisfy a TODO.
5. A sub-agent returns `status: BLOCKED`.

Anything else is normal autonomous flow.

## Engineering contract

Apply to every changed line. Repository guidance wins on conflict.

### Decide

1. Preserve correctness, security, requirements, and existing behavior before optimizing design.
2. Inspect neighboring code and repository conventions before writing. Reuse in this order: existing project capability, standard library/framework, approved dependency, new local code, new dependency.
3. Choose the design with the lowest cognitive load, coupling, mutable state, public surface, and operational risk. Fewer lines alone are not simpler.
4. Add no speculative feature, configuration, extension point, or optimization.

### Abstract and reuse

1. Abstract shared concepts, invariants, and reasons for change—not repeated syntax. Duplication is cheaper than the wrong abstraction.
2. Add an abstraction only when it represents a domain concept, enforces an invariant, isolates an unstable boundary, creates a useful test seam, or removes substantial duplication among consumers that evolve together.
3. Do not add pass-through wrappers, single-use indirection, interfaces for hypothetical implementations, or generic machinery driven by unrelated flags or callbacks.
4. Keep dependencies directed toward stable domain logic. Prefer composition and small explicit units over inheritance and framework-shaped business logic.

### Implement safely

1. Make invalid states hard to represent. Prefer immutable data, explicit data flow, narrow visibility, and side effects at boundaries.
2. Give domain values semantic types when they carry identity, units, invariants, or a closed value set. Do not pass primitive strings or numbers across the codebase when a domain type can prevent invalid interchange.
3. Keep types proportional: do not wrap incidental local values that have no domain meaning or invariant.
4. Validate untrusted data once at trust boundaries. Construct validated domain types there; do not scatter redundant internal validation.
5. Recover from failures only when adding meaningful action or context; otherwise propagate. Preserve causes; never silently swallow failures.
6. Make resource ownership, cleanup, transaction boundaries, cancellation, timeouts, retries, and idempotency explicit where relevant.
7. Bound inputs, collections, queues, concurrency, and retries. Do not retry non-idempotent work without a strategy.
8. Preserve compatibility unless the spec authorizes a break. Keep logs actionable and free of secrets or sensitive data.
9. Optimize from evidence, while avoiding obviously unsuitable algorithms or data structures.

### Verify

1. For a defect, reproduce it before fixing it when practical. Add a regression test.
2. Test observable behavior: the changed success path, realistic boundaries, and relevant failures. Prefer the narrowest valuable test; avoid tests coupled to implementation details.
3. Run repository-defined format, lint, type, compile, and test commands. Do not invent substitutes.
4. Review the final diff for scope creep, accidental compatibility changes, security exposure, dead code, and unnecessary complexity.
5. Report verification that could not be run. Never imply an unrun check passed.

## Front-end principles

When implementing front-end code:

1. Reuse — factor repeated UI patterns into components.
2. Consistency — one design system (color tokens, typography, spacing).
3. Simplicity — small focused components, no unneeded styling complexity.
4. Demo-oriented — structure for quick prototyping (streaming, multi-turn, tools).
5. Visual quality — spacing, padding, hover states held to a high bar.
