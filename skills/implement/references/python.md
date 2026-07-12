# Python

Follow repository Python version, frameworks, type checker, formatter, linter, and conventions first.

1. Type all function inputs and returns. Run the repository's configured `mypy`, `ty`, or equivalent checker; do not weaken checks to silence errors.
2. Model domain identifiers and non-interchangeable primitives with `NewType` when static distinction is sufficient, or frozen dataclasses/value objects when runtime validation or behavior is required.
3. Use `Enum`/`StrEnum` for runtime closed sets and `Literal` for small static-only sets. Use unions plus exhaustive narrowing for variants.
4. Prefer precise types and protocols; use `object` instead of `Any` when the value is unknown. Avoid passing unstructured dictionaries or tuples as domain objects.
5. Prefer functions, dataclasses, and composition over class hierarchies. Use context managers for owned resources.
6. Never use mutable default arguments. Avoid metaprogramming and dynamic attribute tricks without a required use case.
7. Catch the narrowest useful exception. Never use bare `except` or silently discard an error.
8. Keep comprehensions simple; use explicit control flow when it communicates intent better.
9. Validate external data at runtime and construct typed domain values at the boundary. Type hints alone do not enforce runtime correctness.
