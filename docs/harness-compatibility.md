# Harness Compatibility

Buddy keeps reusable behavior in root `skills/` and shared named-agent entrypoints in root `agents/`. Harness manifests point to those directories; they do not duplicate workflow instructions.

## Capability matrix

| Capability | Codex | Claude Code | Cursor |
|---|---|---|---|
| Agent Skills `SKILL.md` | Yes | Yes | Yes |
| Root `skills/` discovery | Manifest path | Manifest path/default | Manifest path/default |
| Root named agents | No plugin component | Yes | Yes |
| Root `agents/` schema | Not consumed | Rich Claude schema | Portable subset: `name`, `description` |
| Skill-triggered subagent | Orchestrator dispatch | Native/custom agents | Native/custom agents |
| Per-agent tool denial | Dispatch/sandbox dependent | Supported, but nonportable | Not in the common documented schema |
| Per-agent model selection | Dispatch API dependent | Supported | Harness dependent |
| Commands | Use skills | Supported; skills preferred | Supported |
| Rules/project instructions | Project `AGENTS.md`, not plugin-shipped | Project `CLAUDE.md`, not plugin-shipped | Plugin `rules/` supported |
| Hooks | Not accepted in Buddy's Codex manifest | Claude hook schema | Different Cursor hook schema |
| MCP root file | `.mcp.json` via manifest | `.mcp.json` | `mcp.json` |
| Local plugin loading | Marketplace install | `claude --plugin-dir .` | Local plugin directory/symlink |

## Shared contracts

Each skill follows the Agent Skills standard: exact `SKILL.md`, standard `name` and `description` frontmatter, a non-empty instruction body, and on-demand references. Harness-only frontmatter stays out of shared skills.

Each specialist skill owns one phase. It cannot activate another Buddy skill unless the user explicitly requests the transition or the `develop` orchestrator explicitly dispatches it. Workers return to their caller instead of advancing themselves. `develop` may enable only stages required by the user's authorized task and must dispatch each stage with bounded scope and success criteria.

This gate is a workflow contract, not a universal security boundary. Claude can enforce stronger tool restrictions with Claude-only agent fields, but those fields are excluded because Cursor's documented portable agent schema guarantees only `name` and `description`. Codex and Cursor enforcement therefore depends on the live tool surface and sandbox.

## Harness details

### Codex

`.codex-plugin/plugin.json` exposes root skills. Codex has no supported plugin `agents` field, so `develop` dispatches generic Codex subagents and explicitly names the required Buddy skill. Root `agents/` files are packaged but not registered as first-class Codex agents. Root `AGENTS.md` maintains this repository and is not inherited by projects installing Buddy.

### Claude Code

`.claude-plugin/plugin.json` points to root skills; Claude's validated manifest schema rejects an explicit `agents` path, so agents use Claude's default root `agents/` discovery. Claude exposes both as namespaced plugin components. Shared agent files intentionally use only the Cursor-compatible metadata subset, so they do not use Claude-only `skills`, `tools`, `disallowedTools`, `model`, or `isolation` fields. This trades Claude-specific enforcement for one shared agent definition.

Source validation uses `claude plugin validate --strict .`. Direct loading uses `claude --plugin-dir .`; marketplace registration is a later, state-mutating integration test.

### Cursor

`.cursor-plugin/plugin.json` points to root skills and agents. Cursor also supports rules, commands, hooks, and MCP, but Buddy does not add empty components. Cursor hooks are not interchangeable with Claude hooks, and Cursor uses `mcp.json` rather than `.mcp.json`.

Local development uses a copy or symlink under `~/.cursor/plugins/local/buddy`, followed by a Cursor window reload. The repository-root `.cursor-plugin/marketplace.json` uses `source: "."`. Root-as-plugin local loading is documented; hosted multi-plugin marketplaces conventionally use plugin subdirectories, so the root source must be confirmed during publication. Moving Buddy under `plugins/buddy/` would violate this repository's root-plugin contract.

## Marketplace boundaries

Codex, Claude Code, and Cursor use different marketplace schemas; the three marketplace files are adapters, not interchangeable catalogs. Keep their plugin id and base version aligned, then validate all harnesses after every change with:

```bash
UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py
```

Registration, installation, publication, and marketplace submission change external or user state and are intentionally outside source validation.

The unified validator applies checked-in schema rules to every harness and invokes Claude's first-party strict validator when available. Agent Skills also has an external reference validator, Codex has the plugin-creator validator, and Cursor publishes JSON schemas rather than a plugin-validation CLI. Those external checks are release-time corroboration; the checked-in validator remains the offline gate after each edit.

## Sources

1. [Agent Skills specification](https://agentskills.io/specification)
2. [Codex skills](https://developers.openai.com/codex/skills)
3. [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference)
4. [Cursor plugin reference](https://cursor.com/docs/reference/plugins)
