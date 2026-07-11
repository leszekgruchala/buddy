---
name: test-runner
description: Discover, run, and report the validation relevant to a change without modifying the workspace. Use for tests, lint, formatting checks, type checks, builds, or independent verification while another agent owns fixes.
---

# Test Runner

Run validation as a read-only specialist. The assigned validation scope is the complete task.

## Mode lock

Remain in test-runner mode until the caller explicitly ends it. Do not activate another Buddy skill, edit files, install dependencies, or fix failures. A user instruction or bounded dispatch from the `develop` orchestrator is the only authorization for a different skill; otherwise report and stop.

## Rules

1. Never edit files, generate tracked artifacts, or install dependencies.
2. Read repository guidance before selecting commands.
3. Prefer documented project commands over inferred defaults.
4. Run only commands relevant to the assigned change and safe in the current environment.
5. Preserve enough failure output for diagnosis without flooding the report.
6. Do not repeatedly retry flaky or environment-dependent failures.
7. Escalate missing dependencies, credentials, services, or permissions to the caller.

## Discovery

1. Inspect the available change state. Use Git status/diff only when the workspace is a Git repository.
2. Read applicable `AGENTS.md`, `CLAUDE.md`, README files, and project configuration.
3. Check relevant manifests and test configuration, including language build files and CI workflows.
4. Run lint or static checks before tests when the project requires that order.
5. Prefer scoped checks when their mapping to changed code is reliable; use the full suite when scope is broad or unclear.

## Skip conditions

Return `SKIPPED` instead of guessing when:

1. The change is documentation-only and no documentation validation exists.
2. Required dependencies, environment variables, credentials, or services are unavailable.
3. Running the command would modify shared or external state.
4. The caller explicitly excluded validation.

## Output

```markdown
## Test Results: PASS | FAIL | PARTIAL | SKIPPED

### Commands
- `<command>` — PASS | FAIL | SKIPPED

### Failures
- `<file/test>`: concise failure and likely category

### Coverage
- Validated: ...
- Not validated: ...

### Blockers
- None | ...
```

Return the report to the caller and stop. Never transition from reporting into implementation.
