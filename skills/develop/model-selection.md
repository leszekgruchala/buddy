# Semantic model selection

Select execution settings, then return to the active skill; this reference is not a configuration tool.

## Tier recommendations

| Tier | Select an available model for | Effort |
|---|---|---|
| `fast` | Bounded facts or deterministic work; prefer economical models and low latency among comparable choices | Lowest supported effort adequate for the task |
| `balanced` | Normal coding, investigation, and local technical choices | Supported default or moderate effort |
| `frontier` | Difficult reasoning, ambiguity, architecture, and technical judgment; prefer high capability | Higher supported effort when useful; maximum is optional |

Tiers recommend capability, not fixed model names or mandatory minimums. One model may serve several tiers; native speed modes may cost more. Review is a role with a `frontier` default and requires fresh independent context.

## Default tiers

Default to `balanced`. Only `spec` and `review-code` default to `frontier`.
The caller judges the work and may recommend another tier. Declared phase runner/tier settings are recommendations too. Selection never changes work instructions, discretion, scope, mutation ownership, or checks.

## Explicit user requests

1. Honor explicit user agent, tier, model, and effort requests within their stated scope, including review. They override Buddy recommendations, even for lower capability. A concrete model request wins over a tier recommendation; an agent request does not replace a separate model or effort request.
2. Carry an invocation-wide request into every worker; a more specific stage request takes precedence and applies only to that stage. Give the selected runner the active skill and effective brief; selection grants no extra authority.
3. Otherwise, select autonomously from current native choices/descriptions and official guidance, without routine user questions. Prices, rankings, and benchmarks are not prerequisites.
4. If native restrictions prevent an explicit choice, stop the affected stage and report why. Never silently substitute an explicit agent, tier, model, or effort.

Do not read or write Buddy model profiles, packaged mappings, or replacement registries. Leave profiles intact but ignored; never ask users to configure tiers or edit native settings.

## Harness dispatch

1. Resolve scoped requests before defaults. An already-dispatched worker executes its brief without reselection/recursive dispatch and reports needed changes to the host.
2. Check agents, models, and effort against the live launch interface and native guidance; catalogs do not prove acceptance. Respect enums and documented string values; never guess identifiers or copy another harness's values. Omit unsupported optional fields. Missing effort control is acceptable unless it prevents an explicit request.
3. Use the host only when verified settings satisfy selection and the skill permits; otherwise dispatch a bounded worker. Skill prose cannot switch the host's model. The host retains communication/decisions. A phase assigned to `Main` keeps local mutation ownership; workers may reason read-only, never execute it.
4. Check exposed effective settings, including pins, caps, and fallback. Distinguish requested, accepted, and observed settings. Truthfully continue adequate automatic fallback; stop for violated explicit choices or required execution.
5. Reuse verified session choices; revalidate after rejection/environment changes. Refresh and reselect rejected automatic choices; never replace explicit requests without user instruction. Do not persist choices or run paid ranking probes. Report unavailable execution to the host; only the host asks users. Uncertainty among adequate choices is not a blocker.

## Native differences

### Codex

Use exposed spawn `model` and `reasoning_effort`; config's `model_reasoning_effort` is not automatically a tool field. If full-history forks forbid overrides, use a supported smaller fork with the complete brief. Check custom-agent pins/defaults; choose unpinned runners only for automatic selection. Omitted fields must resolve to chosen settings; never invent `inherit`.
See [subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and
[model discovery](https://learn.chatgpt.com/docs/app-server).

### Claude Code

Use live Agent-accepted aliases/IDs; its enum may be narrower than the catalog. Providers affect aliases. Use per-call effort only when exposed; prompt text cannot set it. Check native effort caps, actual child settings, and `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` overrides. Aliases are not exact IDs.
See [subagents](https://code.claude.com/docs/en/sub-agents.md) and
[models and effort](https://code.claude.com/docs/en/model-config.md).

### Cursor

Use the live Task `model` enum; CLI/SDK catalogs and frontmatter do not prove acceptance. Use accepted bracket parameters/router preferences only; never synthesize variants or generic effort fields. Routers are not fixed IDs. Check actual account, plan, or admin fallback.
See [subagents](https://cursor.com/docs/subagents.md) and
[SDK model discovery](https://cursor.com/docs/sdk/typescript#cursormodelslist).

## Artifact provenance

For `model_slug` artifacts, establish and pass the author's concrete runtime identity from authoritative task/runtime context. Launch requests/aliases are not proof. Never record tiers, aliases, `inherit`, profile sources, guesses, or the host model as worker provenance. If identity is unavailable, report and stop the affected artifact.
