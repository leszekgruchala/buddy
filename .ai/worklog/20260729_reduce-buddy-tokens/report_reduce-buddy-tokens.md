# Buddy Prompt Token Report

Token counts use `tiktoken` with `o200k_base` on the complete file contents. They are a fixed comparison metric, not a claim that every harness uses the same tokenizer.

## Outcome

- Runtime Markdown total: 9,619 → 7,751 tokens (`-1,868`, `-19.4%`).
- Claude always-on projection: ~830 → ~724 tokens/session (`-106`, `-12.8%`).
- Largest Claude on-invoke projection: `configure-models` ~1,700 → ~1,000 tokens (`-41%`).
- All workflow, safety, model, artifact, and verification contracts remain represented.

## File-by-file runtime comparison

| File | Before | After | Change |
|---|---:|---:|---:|
| `agents/developer.md` | 82 | 51 | -31 |
| `agents/implementor.md` | 102 | 49 | -53 |
| `agents/innovator.md` | 80 | 48 | -32 |
| `agents/researcher.md` | 90 | 53 | -37 |
| `agents/test-runner.md` | 99 | 55 | -44 |
| `skills/archive-worklogs/SKILL.md` | 243 | 216 | -27 |
| `skills/configure-models/SKILL.md` | 1,392 | 882 | -510 |
| `skills/develop/SKILL.md` | 611 | 507 | -104 |
| `skills/implement/SKILL.md` | 620 | 596 | -24 |
| `skills/implement/reference.md` | 776 | 716 | -60 |
| `skills/implement/references/java-kotlin.md` | 265 | 253 | -12 |
| `skills/implement/references/python.md` | 267 | 250 | -17 |
| `skills/implement/references/typescript-javascript.md` | 259 | 246 | -13 |
| `skills/innovate/SKILL.md` | 217 | 183 | -34 |
| `skills/model-policy/SKILL.md` | 1,268 | 1,013 | -255 |
| `skills/model-policy/reference.md` | 1,313 | 939 | -374 |
| `skills/research/SKILL.md` | 327 | 295 | -32 |
| `skills/spec/SKILL.md` | 590 | 497 | -93 |
| `skills/spec/reference.md` | 530 | 514 | -16 |
| `skills/test-runner/SKILL.md` | 488 | 388 | -100 |
| **Total** | **9,619** | **7,751** | **-1,868** |

## Audited and unchanged

These files were reviewed but intentionally not shortened because they do not automatically enter installed-plugin prompts:

- `AGENTS.md`
- `README.md`
- `docs/harness-compatibility.md`
- `scripts/validate.py`
- `skills/archive-worklogs/scripts/archive_worklogs.py`

Plugin manifests, marketplaces, and `skills/archive-worklogs/agents/openai.yaml` remain unchanged because their current metadata is concise and harness-compatible; changing them would not materially reduce skill execution context.

## Validation

- Current official Agent Skills, Codex, Claude Code, and Cursor guidance refreshed before editing.
- Independent Phase 1 semantic audit found six ambiguities; all were corrected.
- Fresh-context `configure-models` inspection correctly resolved the active Codex user profile and reported all required readiness fields.
- Fresh-context `test-runner` returned its required report and passed the full Buddy validator.
- `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py` — PASS.
- Official Agent Skills `skills-ref validate` for all nine skills — PASS.
- Codex plugin-creator `validate_plugin.py` — PASS.
- `claude plugin validate --strict .` — PASS.
- Cursor's published AJV validator and schemas — PASS.
- `git diff --check` — PASS.
- `claude --plugin-dir . plugin details buddy` — PASS, ~724 always-on tokens.
