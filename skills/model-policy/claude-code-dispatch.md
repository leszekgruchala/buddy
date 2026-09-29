# Claude Code model dispatch

Read when configuring, inspecting, or validating Claude Code model profiles, and before dispatching a worker with a model override in Claude Code. Buddy workers start through the live **Agent** tool (subagent launcher).

## Three sources

Claude Code exposes model values on three separate surfaces. Do not conflate them.

| Surface | Source | Use in Buddy |
|---|---|---|
| **Official docs** | `code.claude.com/docs/llms.txt`, then the linked Sub-agents and Model configuration pages | Which values Claude Code can accept and how they resolve |
| **Live Agent tool** | The `model` parameter in the Agent tool definition of the current session | **Ready for Buddy** checks |
| **Installed CLI** | `claude --help` | Installed-version boundaries (`--model`, `--effort`) |

Docs describe what Claude Code supports; only the live Agent tool schema proves what this session accepts. A value the docs allow can still be rejected by the live schema.

## Validate valid values

1. Fetch `https://code.claude.com/docs/llms.txt` and follow its current links to the Sub-agents and Model configuration pages. Do not rely on remembered values or URLs.
2. Read the subagent `model` field rules: aliases, full model IDs, `inherit`, and the resolution order.
3. Read the Model configuration alias table. The version an alias resolves to depends on provider and on `ANTHROPIC_DEFAULT_{SONNET,OPUS,HAIKU,FABLE}_MODEL`.
4. Run `claude --version` and `claude --help`; note the installed version. If docs and CLI disagree, follow the installed version and report the boundary.
5. Read the live Agent tool `model` parameter:
   - **Enum:** the allowed values are exactly the enum values. This is conclusive for that session.
   - **Arbitrary string:** dispatch acceptance is unproven. Use an approved bounded real-agent probe, or mark the value `unverified` and do not persist it.
6. Read the live Agent tool for an effort field. If none exists, per-dispatch effort is unsupported in this session.

Never infer the live enum from the docs, a prior session, packaged defaults, or agent-file frontmatter. The enum can differ by Claude Code version, provider, and plan.

## Valid `model` values

The docs list these subagent `model` values:

| Value | Meaning |
|---|---|
| `sonnet`, `opus`, `haiku`, `fable` | Alias for the latest such model on the current provider |
| Full model ID | Exact model name, accepting the same values as `--model` |
| `inherit` | The main conversation's model |

`default`, `best`, `opusplan`, and `[1m]` variants are session-level selections, not subagent values. Buddy profiles never persist `default`, `best`, or `opusplan`.

A live Agent tool may accept only a subset, commonly the four aliases. In that case a full model ID is rejected even though the docs allow it. Do not substitute an alias for a rejected full ID.

## Request a model as the main agent

Claude Code resolves a subagent's model in this order:

1. The Agent call's per-invocation `model` parameter.
2. The subagent definition's `model` frontmatter.
3. `CLAUDE_CODE_SUBAGENT_MODEL`, when set.
4. The main conversation's model.

To request the tier's model:

1. Resolve the tier through [SKILL.md](SKILL.md) to its `model` and `effort`.
2. Confirm `model` is in the live Agent tool `model` enum.
3. Pass it as the Agent call's `model` parameter, exactly as stored. Never expand an alias to a version or shorten a full ID.
4. Pass `effort` only through an effort field that the live Agent tool exposes. Otherwise omit it and report `effort` as recorded but not applied. Never pass `effort` inside the prompt as a substitute.
5. Never send `inherit` as a concrete value; omit `model` instead.

The per-invocation value wins over the agent definition, so an explicit tier request applies to Buddy's named agents too. Buddy's shipped agent files stay free of `model` and `effort` frontmatter because they use the portable Cursor-compatible schema.

## Confirm what ran

Run `/tasks` in an interactive session. It names the model on the subagent's row and adds effort only when the agent definition or a forked skill sets `effort`. A per-invocation `effort` may not appear there, so absence of effort on that row is not proof it was ignored, and presence is not proof it was applied.

If the task details show a different model than requested, report the actual model. Known causes: an `availableModels` allowlist substituted the newest permitted version of an alias family, or a blocked non-alias value fell back to the inherited model. Do not retry with another model.

## Common mistakes

| Mistake | Why it fails |
|---|---|
| Passing `claude-sonnet-5-5` when the live enum lists only aliases | The tool rejects it with an `invalid_value` error listing the accepted values |
| Treating docs as proof of dispatch | The live schema can be narrower than the docs |
| Expanding `opus` to a version | Aliases float by design; pin versions with `ANTHROPIC_DEFAULT_OPUS_MODEL` in the environment, not in the profile |
| Passing effort in the prompt | It is not a native dispatch field |
| Setting `CLAUDE_CODE_SUBAGENT_MODEL` to force a tier | It applies only when neither the call nor the definition sets a model |
| Reusing a Cursor or Codex value | Slugs never cross products |

## Related sources

- Claude Code docs index: https://code.claude.com/docs/llms.txt
- Sub-agents: https://code.claude.com/docs/en/sub-agents.md
- Model configuration: https://code.claude.com/docs/en/model-config.md
- Profile contract: [reference.md](reference.md)
