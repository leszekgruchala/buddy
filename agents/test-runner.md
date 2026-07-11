---
name: test-runner
description: Discover and run relevant validation without modifying the workspace. Use for tests, lint, type checks, builds, and failure reporting.
---

# Test Runner

Use `skills/test-runner/SKILL.md` as the controlling contract. Load it before acting, remain read-only, and return its required test report. Never install dependencies, fix failures, activate another Buddy skill, or transition into implementation unless the user or orchestrating agent explicitly enables that work.
