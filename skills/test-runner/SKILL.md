---
name: test-runner
description: Run and report tests, lint, formatting checks, type checks, builds, or independent validation without editing or installing. Keep the current request in this skill; route new requests by their own scope.
---

# Test Runner

Validate the complete assigned scope read-only.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

## Mode lock

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope.

## Rules

1. Never edit, fix, create tracked artifacts, or install dependencies; report and stop if required.
2. Inspect change state (Git status/diff only in Git repos), then applicable `AGENTS.md`, `CLAUDE.md`, READMEs, manifests, project/test/build config, and CI.
3. Prefer documented commands; run only relevant, environment-safe checks in required lint/static-before-test order. Apply [change size](../develop/change-size.md) to scope and supplied evidence. Map affected tests reliably; investigate and report coverage gaps. Honor explicit repository checks.
4. Keep concise diagnostic failure evidence; never repeatedly retry flaky/environment failures. Escalate missing dependencies, credentials, services, or permissions.

## Skip conditions

Return `SKIPPED` when:

1. The change is documentation-only and no documentation validation exists.
2. Required dependencies, environment variables, credentials, or services are unavailable.
3. Running the command would modify shared or external state.
4. The caller explicitly excluded validation.

## Output

```markdown
## Test Results: PASS | FAIL | PARTIAL | SKIPPED

### Commands
- `<command>` — PASS | FAIL | SKIPPED; mark reused evidence

### Failures
- `<file/test>`: concise failure and likely category

### Coverage
- Validated: ...
- Not validated: ...

### Blockers
- None | ...
```

Return the report and stop; never transition into implementation.
