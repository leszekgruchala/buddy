# TypeScript and JavaScript

Follow repository runtime targets, compiler settings, frameworks, formatter, linter, and conventions.

1. TypeScript: preserve strict checking; use `unknown` at untrusted boundaries, validate, then narrow—avoid `any`.
2. Use branded/opaque types or value objects for identifiers, units, and validated primitives so incompatible primitives cannot mix.
3. For closed constants, use `as const` objects plus literal unions, or enums when runtime identity/conventions require them. Use discriminated unions and exhaustive handling for state variants.
4. Avoid assertions/non-null assertions unless proved by a local invariant; construct validated domain types at boundaries instead of recasting.
5. Infer incidental local types; explicitly type public APIs/domain boundaries. TypeScript types do not validate runtime data.
6. Prefer modules, `const`, explicit flow, and small pure functions; avoid correctness-dependent coercion.
7. Keep async flow flat: propagate failures, check failed network responses, define cancellation where supported, and never ignore returned promises.
8. JavaScript: when the repository uses JSDoc checking, use frozen object constants and JSDoc `@typedef`/`@enum`; validate domain values at runtime.
