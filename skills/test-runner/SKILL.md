---
name: test-runner
description: Discover, run, and report change validation without modifying the workspace. Use for tests, lint, formatting, type checks, builds, or independent verification while another agent owns fixes. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Test Runner

Validate the complete assigned scope read-only.

## Mode lock

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill. Do not edit, install, or fix; otherwise report and stop.

## Rules

1. Never edit files, create tracked artifacts, or install dependencies.
2. Inspect change state (Git status/diff only in a Git repo), then applicable `AGENTS.md`, `CLAUDE.md`, READMEs, manifests, project/test/build config, and CI workflows.
3. Prefer documented commands; run only relevant, environment-safe checks and honor required lint/static-before-test order.
4. Use scoped checks only with reliable change mapping; otherwise use the full suite.
5. Keep enough failure evidence to diagnose, but concise; do not repeatedly retry flaky or environment failures.
6. Escalate missing dependencies, credentials, services, or permissions.

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
- `<command>` — PASS | FAIL | SKIPPED

### Failures
- `<file/test>`: concise failure and likely category

### Coverage
- Validated: ...
- Not validated: ...

### Blockers
- None | ...
```

Return the report and stop; never transition into implementation.
