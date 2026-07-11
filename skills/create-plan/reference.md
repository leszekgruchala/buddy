# create-plan reference

## Choosing `agent`

| Agent | When |
|-------|------|
| Main | Trivial ops, < ~50 LOC, no parallel benefit, single-file edit. |
| implementor | Default for implementation phases; execute a fully-specified change set. |
| researcher | Read-only context gathering, doc lookups, codebase tracing. |
| test-runner | Run existing tests/lint/typecheck and report. Read-only. |

## Choosing `tier`

| Tier | Use for |
|------|---------|
| fast | default normal implementation after planning, tests, lint, simple edits, doc fetch, parallel fan-out over many small files |
| balanced | codebase research, integration-heavy implementation, debugging, or moderate ambiguity |
| frontier | architecture, gnarly cross-cutting refactors, complex debugging, cross-project research |

Plans stay agent-agnostic; the implementer maps tier → concrete model from its environment whitelist. See `skills/implement/reference.md` for the mapping table.

## Phase independence checklist

A phase pair is safe to put in `parallel_with` only if **all** of the following hold:

1. `project` values differ. Same-project phases share compile/lint/test state — daemons, build caches (Gradle, Bazel, mypy, tsc, esbuild), lockfiles, generated sources, and verification ports — and corrupt each other under concurrency, even with disjoint `files_touched`.
2. `files_touched` sets are disjoint.
3. Neither's `success_criteria` reads files the other writes.
4. No shared external state (same port, DB rows, env var, git ref).
5. Either ordering (or simultaneous) still passes both phases' `success_criteria`.

If any item is uncertain, declare a `depends_on` edge instead.

## Choosing `project`

A `project` is the smallest scope at which compile/lint/test runs cleanly in isolation:

| Repo shape | `project` value example |
|------------|-------------------------|
| Single-package repo | repo name (e.g., `ai-tools`) |
| Gradle / Maven multi-module | module path (e.g., `services:auth`) |
| pnpm / npm / yarn workspaces | workspace package name (e.g., `@org/web`) |
| Python monorepo with per-package `pyproject.toml` | package directory (e.g., `packages/api`) |
| Bazel / Buck | target package label root (e.g., `//apps/web`) |
| Mixed-language monorepo | per-language sub-tree (e.g., `backend`, `frontend`) |

Use stable, short identifiers. Two phases with the same `project` always serialize.
