# Cursor Task dispatch discovery

Read when configuring, inspecting, or validating Cursor model profiles. Buddy workers dispatch through Cursor's **Task** tool (subagent launcher), not through the main chat model picker alone.

## Two model lists

Cursor exposes two different model surfaces. Do not conflate them.

| Surface | Source | Scope | Use in Buddy |
|---|---|---|---|
| **Account catalog** | `cursor-agent models` | Models your account can select for the main agent and CLI | **Available to you** checks only |
| **Task dispatch** | Live `Task` tool schema in the current Cursor session | Models the Task tool accepts in its `model` parameter | **Ready for Buddy** checks |

The account catalog is a superset. A model can appear in `cursor-agent models` and still be rejected by Task dispatch. A model can appear in Task dispatch and still be blocked later by plan, team policy, or transient availability.

Custom subagents in `.cursor/agents/*.md` can also use `inherit` or catalog model IDs with bracket parameters. That path is broader than Buddy's Task dispatch and is **not** authoritative for `configure-models`.

## Derive Task-accepted models

There is no verified standalone CLI that lists Task-accepted models. `cursor-agent models` lists the account catalog only.

### In a live Cursor agent session (authoritative)

1. Locate the **Task** tool definition available to the current agent (the subagent launcher; not `cursor-agent`, not MCP tools).
2. Read the **`model` parameter** on that tool.
3. If the parameter is an **enum**, the allowed concrete slugs are those enum values **except** `inherit`. Treat `inherit` as always valid and never persist it as a concrete profile value.
4. If the parameter accepts **arbitrary strings**, catalog membership is not dispatch proof. Use an approved bounded real-agent probe or mark the value **Not confirmed** and do not persist it.
5. **Never** derive Task dispatch from:
   - `cursor-agent models` output alone
   - Cursor Settings → Models
   - a prior chat answer, another session, or remembered enum
   - Buddy packaged defaults
   - subagent frontmatter in `.cursor/agents/`
   - SDK `Cursor.models.list()` without intersecting Task dispatch

The Task enum is **session-specific**. It can change with account, plan, team policy, enabled models, and Cursor version. Re-read it every time `configure-models` runs.

### When the agent cannot read Task schema

Ask the user to run this in Cursor chat:

```text
list Task-accepted models
```

Use the returned slug list as the dispatch source for that session. If the user pastes the list, treat it as the live enum for the current workflow.

### Validate a candidate slug

For each concrete tier value:

1. **Profile/schema** — scalar slug satisfies the Cursor tier shape in [reference.md](reference.md).
2. **Account/catalog** — exact slug appears in `cursor-agent models` output (after verifying `cursor-agent models --help`).
3. **Task dispatch** — exact slug appears in the live Task `model` enum for this session, or is confirmed by an approved bounded probe when the schema is not enumerated.

Persist only when steps 2 and 3 both pass. `inherit` skips steps 2 and 3.

## Report the results

When reporting Cursor validation:

- **Available to you** — slug found in `cursor-agent models`.
- **Ready for Buddy** — slug found in the live Task `model` enum (or probe-confirmed).

If Task dispatch is unknown because the schema could not be read, say **Not confirmed** and show the Task-accepted list once discovered. Do not claim a slug is unavailable for Buddy based on catalog shape, `-fast` naming, or a stale enum from another session.

## Common mistakes

| Mistake | Why it fails |
|---|---|
| Treating `cursor-agent models` as the Buddy list | Catalog includes models Task rejects (for example non-`Fast` variants when Task exposes only `*-fast` slugs). |
| Using a remembered or copied enum from another session | Task enums differ by account and change over time (for example `kimi-k3-max` or `glm-5.2-max` may appear in one session and not another). |
| Inferring Task support from packaged defaults | Defaults express intent; dispatch still requires live validation. |
| Substituting a nearby slug | Buddy never maps `composer-2.5` → `composer-2.5-fast` or `cursor-grok-4.6-high` → `cursor-grok-4.6-high-fast`. |
| Confusing UI/custom subagents with Task dispatch | UI subagents default to `inherit` (parent model) and custom agents can pin catalog IDs; Buddy uses Task `model` overrides. |

## Bracket parameters and flat slugs

Subagent frontmatter and CLI `--model` accept bracket forms such as `composer-2.5[fast=false]`. The Task tool enum in current sessions exposes **flat slugs** (for example `composer-2.5-fast`). Copy the exact Task enum string; do not synthesize bracket forms unless Task dispatch accepts them verbatim.

## Related sources

- Cursor subagents: https://cursor.com/docs/subagents.md
- Account catalog CLI: `cursor-agent models --help`, then `cursor-agent models`
- Profile contract: [reference.md](reference.md)
