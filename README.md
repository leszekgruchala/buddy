# Buddy AI Dev Support

Reusable coding workflows packaged for Codex, Claude Code, and Cursor.

## Layout

1. `skills/` contains the harness-agnostic Agent Skills contracts.
2. `agents/` contains shared Claude Code and Cursor agent entrypoints.
3. `.codex-plugin/`, `.claude-plugin/`, and `.cursor-plugin/` contain harness adapters.
4. `docs/harness-compatibility.md` records capability differences and limitations.

## Validation

Run from the repository root after every change:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Validate source integration before registering or installing any local marketplace.
