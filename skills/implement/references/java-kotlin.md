# Java and Kotlin

Follow repository versions, frameworks, compiler settings, and conventions first.

1. Model domain identifiers, units, money, validated values, and other non-interchangeable concepts as dedicated types—not `String`, `Long`, or other primitives.
2. Use Java records/final value objects or Kotlin data/value classes. Validate invariants at construction; keep values immutable.
3. Use enums for closed constant sets and sealed types for closed variants with distinct data or behavior. Require exhaustive handling where supported.
4. Prefer narrow visibility and explicit nullability. Do not use sentinel primitives or nullable values when a domain type can express the states.
5. Add interfaces only for meaningful contracts or boundaries. Use inheritance only for genuine substitutability.
6. Own resources with try-with-resources or `use`. Catch specific exceptions only to recover, translate, or add context.
7. Prefer clear loops or collection operations over dense streams/chains. Avoid reflection, raw types, unchecked casts, and serialization machinery unless required.
8. In Kotlin, prefer `val`, immutable collection interfaces, top-level functions, and structured concurrency. Do not launch unowned coroutines.
9. Avoid `!!` and unclear scope-function chains. State public types at library and Java/platform boundaries; do not mechanically translate Java patterns into Kotlin.
