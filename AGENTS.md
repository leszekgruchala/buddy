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

## README Maintenance

1. Update `README.md` in the same change whenever a skill or public workflow is added or changed. Document the user benefit, current behavior, and relevant usage examples; a Skills table entry alone is not enough for a new skill.
2. Link useful examples. For HTML reports, provide a rendered preview that opens in a browser, plus the repository file for local use. A GitHub source view is not a rendered preview. Verify the hosted page and its interactions before linking it.
3. Before publishing a release, compare its changes with the README and confirm that new features, compatibility changes, and required user actions are documented. Keep claims supported by the shipped behavior.
4. For Buddy installation or update questions, read and cite the README's current instructions first. Use its native harness commands; do not reconstruct instructions from memory or recommend reinstalling or copying local folders for a marketplace update.

## GitHub Release Notes

Apply these rules whenever you create or edit a GitHub release for this project.

1. Write for customers and potential customers. Lead with what they can now do, what works better, or which problem the release solves. Use clear, confident product language that makes the value easy to understand.
2. Use valid Markdown: a short opening paragraph, descriptive headings when useful, and bullets for distinct features or fixes. Put blank lines before headings and lists. Use backticks for identifiers and Markdown links for useful references.
3. Review the changes since the previous release. Highlight the main new features, meaningful improvements, and bug fixes. Describe each change through its effect on the customer's workflow; do not copy commit messages or list every internal edit.
4. Keep claims supported by the released changes. Do not invent features or promise unmeasured gains in speed, cost, quality, or reliability. Scale the notes to the release: a small patch can have one short paragraph or a few bullets. Omit empty sections.
5. Include compatibility changes, breaking changes, required upgrade steps, and known limitations only when they affect customers. Explain what the customer needs to do.
6. Keep engineering verification out of release notes. Do not include test counts, validator output, passed checks, build logs, commit hashes, file inventories, or agent workflow details. Report that evidence in the maintainer handoff instead.
7. Before publishing, check that the notes render as Markdown, describe the actual release, and give customers useful reasons to upgrade. Use a concise title that names the main customer benefit.

## Skill Evaluations

1. Use a no-Buddy baseline for the initial skill evaluation set.
2. For every later release, evaluate each skill or behavior affected by that release against the previous released version.
3. Keep the fixture, prompt, model, effort, permissions, tool availability, and output schema identical between candidate and baseline runs.

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
