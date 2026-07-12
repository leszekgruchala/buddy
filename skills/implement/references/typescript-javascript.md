# TypeScript and JavaScript

Follow repository runtime targets, compiler settings, frameworks, formatter, linter, and conventions first.

1. In TypeScript, preserve strict checking. Use `unknown` at untrusted boundaries, validate, then narrow; avoid `any`.
2. Represent domain identifiers, units, and validated primitives with branded/opaque types or value objects so incompatible primitives cannot be interchanged.
3. Use `as const` objects plus literal unions for closed constants, or enums when runtime identity or project conventions require them. Use discriminated unions and exhaustive handling for state variants.
4. Avoid assertions and non-null assertions unless a local invariant proves them. Construct validated domain types at boundaries instead of repeatedly casting.
5. Infer incidental local types; describe public APIs and domain boundaries explicitly. Remember TypeScript types do not validate runtime data.
6. Prefer modules, `const`, explicit data flow, and small pure functions. Avoid correctness-dependent coercion.
7. Keep asynchronous control flow flat. Propagate failures, check failed network responses, define cancellation where supported, and never ignore returned promises.
8. In JavaScript, use frozen object constants and JSDoc `@typedef`/`@enum` types when the repository uses JSDoc checking; validate domain values at runtime.
