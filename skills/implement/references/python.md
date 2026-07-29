# Python

Follow the repository's Python version, frameworks, type checker, formatter, linter, and conventions.

1. Type every function input/return. Run the configured `mypy`, `ty`, or equivalent; never weaken checks to silence errors.
2. Model identifiers/non-interchangeable primitives with `NewType` for static distinction or frozen dataclasses/value objects for runtime validation/behavior.
3. Use `Enum`/`StrEnum` for runtime closed sets, `Literal` for small static-only sets, and unions with exhaustive narrowing for variants.
4. Prefer precise types/protocols and `object` over `Any` for unknown values; avoid unstructured dictionaries/tuples as domain objects.
5. Prefer functions, dataclasses, and composition over class hierarchies; use context managers for owned resources.
6. Never use mutable default arguments. Avoid metaprogramming and dynamic attribute tricks without a required use case.
7. Catch the narrowest useful exception; never use bare `except` or silently discard errors.
8. Keep comprehensions simple; use explicit control flow when it communicates intent better.
9. Validate external data and construct typed domain values at runtime boundaries; type hints do not enforce runtime correctness.
