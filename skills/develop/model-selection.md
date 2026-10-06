# Semantic model selection

Select execution settings, then return to the active skill. This is a shared reference,
not a skill or configuration tool.

## Tier recommendations

| Tier | Select an available model for | Effort |
|---|---|---|
| `fast` | Bounded facts or deterministic work; prefer economical models and low latency among comparable choices | Lowest supported effort adequate for the task |
| `balanced` | Normal coding, investigation, and local technical choices | Supported default or moderate effort |
| `frontier` | Difficult reasoning, ambiguity, architecture, and technical judgment; prefer high capability | Higher supported effort when useful; maximum is optional |

Tiers recommend capability, not fixed model names or mandatory minimums. One model can
serve several tiers. Native speed modes may cost more. Review is a role with a
`frontier` default; its fresh independent context remains required.

## Default tiers

Default to `balanced`. Only `spec` and `review-code` default to `frontier`.
The caller judges the work and may recommend `fast` or `frontier` instead. Declared
phase runner/tier settings are recommendations too. Selection changes neither the
phase's work instructions and discretion nor its scope, mutation ownership, or checks.

## Explicit user requests

1. Honor explicit user agent, tier, model, and effort requests within their stated scope
   for every skill, including review. They override Buddy recommendations, even for
   lower capability. A concrete model request wins over a tier recommendation; an agent
   request does not replace a separate model or effort request.
2. Carry an invocation-wide request into every worker; a more specific stage request
   takes precedence. Stage requests apply only to that stage. Give the selected runner
   the active skill and effective brief; selection grants no extra authority.
3. Otherwise, select autonomously from current native choices and descriptions using
   these recommendations and official guidance, without routine user questions. Numeric
   prices, comparative rankings, and benchmarks are not prerequisites.
4. If native restrictions prevent an explicit choice, stop the affected stage and report
   the limitation. Never silently substitute an explicit agent, tier, model, or effort.

Do not read or write Buddy model profiles, packaged mappings, or replacement registries.
Leave existing profiles intact but ignore them. Do not ask users to configure tiers or
edit their native settings.

## Harness dispatch

1. Resolve scoped requests before defaults. An already-dispatched worker executes its
   brief without reselection or recursive dispatch; it reports needed changes to the host.
2. Check agents, models, and effort against the live launch interface and native guidance.
   Catalog visibility does not prove dispatch acceptance. Respect enums; arbitrary string
   fields still require documented values. Never guess identifiers or copy another
   harness's values. Omit unsupported optional fields; missing effort control is acceptable
   unless an explicit effort request cannot be honored.
3. Use the host only when its verified settings satisfy the selection and the skill
   permits it; otherwise dispatch a bounded worker. Skill prose cannot switch the host's
   model. The host retains communication and decisions. A phase assigned to `Main` keeps
   local mutation ownership; workers may supply read-only reasoning, not execute it.
4. Check effective settings when exposed, including native pins, caps, and fallback.
   Distinguish requested, accepted, and observed settings. Continue an adequate automatic
   fallback truthfully; stop if it violates an explicit choice or required execution.
5. Reuse verified session choices; revalidate after rejection or environment changes.
   On automatic rejection, refresh and select another supported option. Never replace an
   explicit request without user instruction. Do not persist choices or run paid ranking
   probes. Report unavailable execution to the host; only the host asks the user. Routine
   uncertainty among adequate choices is not a blocker.

## Native differences

### Codex

Use live spawn `model` and `reasoning_effort` fields when exposed; config's
`model_reasoning_effort` is not automatically a tool field. Where full-history forks forbid overrides,
use a supported smaller fork with the complete brief. Custom agent files may override
spawn settings: check pins/defaults and choose an unpinned runner only for automatic
selection. Omission must actually resolve to the chosen settings; never invent `inherit`.
See [subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents) and
[model discovery](https://learn.chatgpt.com/docs/app-server).

### Claude Code

Use aliases/IDs accepted by the live Agent interface, whose enum may be narrower than
the catalog. Provider settings affect aliases. Send per-call effort only when exposed;
prompt text cannot set it. Agent/session effort may have native caps, and
`CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` may override model selection. Check actual child
settings; an alias is not an exact model ID.
See [subagents](https://code.claude.com/docs/en/sub-agents.md) and
[models and effort](https://code.claude.com/docs/en/model-config.md).

### Cursor

Use the live Task `model` enum. CLI/SDK catalogs and agent frontmatter do not prove Task
acceptance. Use bracket parameters or router preferences only where accepted; never
synthesize model variants or generic effort fields. Routers are not fixed model IDs.
Check actual task settings for account, plan, or admin fallback.
See [subagents](https://cursor.com/docs/subagents.md) and
[SDK model discovery](https://cursor.com/docs/sdk/typescript#cursormodelslist).

## Artifact provenance

For artifacts requiring `model_slug`, establish the author's concrete runtime identity
from authoritative task/runtime context and pass it to the author. A launch request or
alias is not proof. Never record a tier, alias, `inherit`, profile source, guessed name,
or the host model as worker provenance. If identity is unavailable, report it and stop
the affected artifact.
