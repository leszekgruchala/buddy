<p align="center">
  <img src="assets/buddy.svg" width="144" alt="Blueprint Buddy">
</p>

# Buddy

> Plan the work. Control the context. Ship with proof.

Buddy packages reusable coding workflows for Codex, Claude Code, and Cursor.
It turns research, decisions, implementation, and verification into inspectable project artifacts.

Plan mode is a pause before coding. Buddy is the workflow around coding.

## Why Buddy?

- **Documentation you own** — research and specs are persisted in `.ai/worklog/`, so decisions stay inspectable and editable.
- **Focused context** — each stage and implementation phase receives only the contract and evidence it needs.
- **Portable workflow** — the same shared skills run across Codex, Claude Code, and Cursor, locally or in cloud checkouts where the plugin and committed project files are available.
- **Safer boundaries** — explicit scope, bounded workers, and verification reduce accidental overreach; Buddy is a workflow guardrail, not a security boundary.

## The workflow

[`research`](skills/research/SKILL.md)? → [`innovate`](skills/innovate/SKILL.md)? → [`spec`](skills/spec/SKILL.md)? → [`implement`](skills/implement/SKILL.md) → verify

Optional stages are selected only when useful; [`develop`](skills/develop/SKILL.md) coordinates non-trivial work.

## Install

From this repository's root, register the local marketplace and install Buddy:

```bash
codex plugin marketplace add .
codex plugin add buddy@buddy
```

The ChatGPT desktop app's shared Plugin Directory may separately offer **Install** or **Connect** for `buddy`; this does not replace the Codex CLI install. See [Claude Code and Cursor local-loading details](docs/harness-compatibility.md#refresh-local-development-installs).

## Configure models

After installing Buddy, ask the agent: “Configure the models Buddy should use here.” Buddy stores complete harness-specific choices in `.buddy/model-profile.yaml` (project) or `~/.buddy/model-profile.yaml` (user); the project profile takes precedence over the user profile. See [`configure-models`](skills/configure-models/SKILL.md) and the [model profile contract](skills/model-policy/reference.md).

A committed project profile travels to cloud agents when it is included in their checkout; the local user profile is a fallback across local projects and does not travel automatically. Invalid or unavailable configured values safely inherit the current orchestrator model rather than being silently substituted.

## Compatibility and validation

See the [harness capability matrix](docs/harness-compatibility.md#capability-matrix) for supported differences and boundaries. Run the unified validator from the repository root after every change:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```
