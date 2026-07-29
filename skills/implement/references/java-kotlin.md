# Java and Kotlin

Follow repository versions, frameworks, compiler settings, and conventions.

1. Give identifiers, units, money, validated values, and other non-interchangeable concepts dedicated types—not `String`, `Long`, or other primitives.
2. Use Java records/final value objects or Kotlin data/value classes; validate on construction and keep them immutable.
3. Use enums for closed constants and sealed types for variants with distinct data/behavior; require exhaustive handling where supported.
4. Prefer narrow visibility and explicit nullability; avoid sentinel primitives or nullable values when domain types can express the states.
5. Add interfaces only for meaningful contracts/boundaries and inheritance only for genuine substitutability.
6. Own resources with try-with-resources/`use`. Catch specific exceptions only to recover, translate, or add context.
7. Prefer clear loops/collection operations over dense streams/chains. Avoid reflection, raw types, unchecked casts, and serialization machinery unless required.
8. Kotlin: prefer `val`, immutable collection interfaces, top-level functions, and structured concurrency; never launch unowned coroutines.
9. Avoid `!!` and unclear scope-function chains. State public types at library and Java/platform boundaries; do not mechanically translate Java patterns into Kotlin.
