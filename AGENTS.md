# Buddy Repository Instructions

This repository packages the `buddy` AI coding support assets as a Codex plugin.

## Repository Contracts

1. Keep the plugin id `buddy`.
2. Keep this repository root as the plugin root.
3. Keep Codex marketplace entries in `.agents/plugins/marketplace.json`.
4. Keep shared skills and agents at root; harness manifests only point to them.
5. Keep Codex, Claude Code, and Cursor manifests and marketplaces aligned.
6. Keep `README.md` aligned with verified CLI commands.

## Editing Rules

1. Make surgical changes only.
2. Do not rename plugin ids, marketplace names, paths, or command examples unless requested.
3. Do not delete copied agents, skills, or marketplace files unless requested.
4. Do not edit when the user is only asking for analysis or recommendations.
5. Do not put absolute paths to personal/local helper scripts in repository docs.
6. Do not invent first-party CLI commands; verify documented commands with `--help` before adding them.
7. Prefer current first-party CLI tooling over local scripts for documented package checks.
8. End text files with exactly one trailing newline.

## Documentation Freshness

Before changing any skill, agent, manifest, marketplace, hook, MCP definition, or harness-specific documentation:

1. Refresh the relevant official agent-readable index and follow its current links. Prefer `llms.txt` and linked `.md` pages over search results or remembered URLs. If unavailable, use the current official HTML documentation.
2. Use only the harness's official documentation, published schemas, installed CLI help, and available first-party skills. Do not infer one harness from another or rely on training knowledge for fields, paths, commands, or capabilities.
3. Verify every documented CLI command with the installed CLI's `--help` before adding or changing it. If current docs and the installed version disagree, preserve compatibility with the installed version and document the version boundary.
4. Re-check all harnesses after any shared `skills/` or `agents/` change. A change requested for one harness still requires cross-harness validation.

### Sources

1. Agent Skills:
   - Index: https://agentskills.io/llms.txt
   - Full bundle for broad review: https://agentskills.io/llms-full.txt
   - Specification: https://agentskills.io/specification.md
   - Best practices: https://agentskills.io/skill-creation/best-practices.md
   - Reference validator: https://github.com/agentskills/agentskills/tree/main/skills-ref
2. Codex:
   - Use the `openai-docs` skill for current Codex documentation and `plugin-creator` for manifest and marketplace work when available.
   - Root index: https://developers.openai.com/llms.txt
   - Codex index: https://developers.openai.com/codex/llms.txt
   - Codex full bundle for broad review: https://developers.openai.com/codex/llms-full.txt
   - Follow the current index entries for Build plugins, Build skills, `AGENTS.md`, customization, and subagents; do not guess page paths.
   - Verify syntax with `codex plugin --help` and the relevant subcommand help.
3. Claude Code:
   - Index: https://code.claude.com/docs/llms.txt
   - Full bundle for broad review: https://code.claude.com/docs/llms-full.txt
   - Follow its current plugin reference, plugin marketplace, skills, and subagents pages.
   - Verify syntax with `claude plugin --help`; validate with `claude plugin validate --strict .`.
4. Cursor:
   - Index: https://cursor.com/llms.txt
   - Full bundle for broad review: https://cursor.com/llms-full.txt
   - Plugin reference: https://cursor.com/docs/reference/plugins.md
   - Plugin guide: https://cursor.com/docs/plugins.md
   - Skills: https://cursor.com/docs/skills.md
   - Subagents: https://cursor.com/docs/subagents.md
   - Published schemas and validator: https://github.com/cursor/plugins
   - Verify local loading options with `cursor-agent --help`.

## Validation

After every repository change, validate every harness definition, even when the edit appears harness-specific:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

The validator checks Agent Skills, shared agents, Codex, Claude Code, Cursor, marketplaces, links, and trailing newlines. It also runs `claude plugin validate --strict .` when Claude Code is installed. Fix every failure before handoff.

After refreshing documentation, update `scripts/validate.py` first when an official schema or contract has changed; an outdated validator is not evidence of compatibility. For release-level corroboration, also run the current Agent Skills reference validator, Codex `plugin-creator` validator, Claude strict validator, and Cursor's published schemas/validator as documented by their refreshed sources.

Installation and marketplace registration are separate integration tests. Do not mutate local plugin state unless the user explicitly requests it.

## Scope

This root `AGENTS.md` is maintainer guidance for this repository. It is not automatically inherited by projects that install the plugin.
