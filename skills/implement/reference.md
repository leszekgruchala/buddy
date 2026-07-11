# implement reference

## Deviation taxonomy

Stop and ask the user when any of these occur:

1. A file the plan assumed to exist does not.
2. Two requirements contradict each other.
3. A `success_criteria` failure can only be fixed by editing files outside `files_touched`.
4. An `out_of_scope` change is required to satisfy a TODO.
5. A sub-agent returns `status: BLOCKED`.

Anything else is normal autonomous flow.

## Engineering principles

Apply to every line you write or change. These extend the global guidance in `AGENTS.md`/`CLAUDE.md`; when they conflict, that guidance wins.

### Think before coding

Before writing code, briefly:

1. Restate the goal and the inputs, outputs, and edge cases it must handle.
2. Search the codebase for existing functions, components, types, or patterns that already solve part of it (Grep/Glob/LSP). Prefer reusing or extending them over writing new code.
3. Read 1-2 neighboring files to learn local naming, structure, error handling, and idioms; mirror them.
4. Choose the simplest design that satisfies the goal. Between equivalent designs, pick the one with less code and fewer moving parts.

### Simplicity (KISS / YAGNI)

1. Write the minimum code that solves the actual request. No speculative features, config, or flexibility for hypothetical futures.
2. Prefer clear, idiomatic, language-standard constructs over clever or exotic ones.
3. No premature optimization; optimize only with evidence of a real bottleneck.
4. Self-review the diff before declaring done: "Would a senior call this overcomplicated? Could 200 lines be 50?" If yes, rewrite.

### Reuse and DRY

1. Don't duplicate logic that already exists; import or extend it.
2. Factor out a shared helper or abstraction only when real duplication exists — rule of three: extract on the third repetition, not the first. No single-use abstractions or indirection "just in case".
3. Keep abstractions shallow and named for intent. An abstraction must remove more complexity than it adds.

### Structure

1. Small, focused units with a single responsibility and a clear name.
2. Minimize public surface and shared mutable state; prefer pure functions and composition over inheritance.
3. Validate untrusted input at boundaries; handle realistic failures, not impossible ones.

### Done means

1. Code follows local style and the language's idioms.
2. No orphaned imports, variables, or functions introduced by the change.
3. Lint, type, and test gates pass (see VERIFICATION COMMANDS and `AGENTS.md`).

## Front-end principles

When implementing front-end code:

1. Reuse — factor repeated UI patterns into components.
2. Consistency — one design system (color tokens, typography, spacing).
3. Simplicity — small focused components, no unneeded styling complexity.
4. Demo-oriented — structure for quick prototyping (streaming, multi-turn, tools).
5. Visual quality — spacing, padding, hover states held to a high bar.
