---
name: configure-models
description: Configure, reconfigure, inspect, or validate Buddy's exact fast, balanced, and frontier model choices for the current Codex, Cursor, or Claude Code harness. Use when the user asks to set up Buddy models, optimize model choices for cost, speed, or quality, inspect the active Buddy model profile, or check whether saved models remain available.
---

# Configure Models

Configure one current-harness section in either the project-owned `.buddy/model-profile.yaml` or the user-owned `~/.buddy/model-profile.yaml`. This skill changes model preferences only; it does not change Buddy's stage-to-tier policy.

Read the complete [model profile contract](../model-policy/reference.md) before inspecting, validating, or writing the profile.

## Gate

Work only with the harness on which the current agent is running. Detect it from the live runtime; do not infer one harness from another or configure a harness that cannot be validated from the current surface.

This is a focused specialist workflow. After reporting the configuration result, return control to the caller. Do not activate another Buddy skill, dispatch project work, edit an installed plugin cache, or broaden the profile into general Buddy settings.

## Modes

- **Configure or reconfigure** — discover candidates, settle all three tiers, validate them, and replace only the current-harness section after approval.
- **Inspect** — show the current-harness section, its effective source, and its current live validation result without changing it.
- **Validate** — re-run current profile, catalog, and dispatch checks without changing the profile.

If the request is ambiguous, inspect first and ask whether the user wants to change the current mapping.

## Workflow

1. Detect the current harness from the live runtime and identify the native model and reasoning fields accepted by its subagent dispatch interface.
2. Read `.buddy/model-profile.yaml` and `~/.buddy/model-profile.yaml` when they exist. Resolve their current-harness sections using the shared precedence contract. Never edit an installed Buddy skill or plugin cache. If either file cannot be parsed safely, report the error and do not overwrite it.
3. For configure or reconfigure, verify current CLI help before using a first-party account-aware discovery command. Collect exact model identifiers and supported reasoning, effort, thinking, speed, or other model-specific parameters without rewriting them.
4. Compare discovery results with the live subagent dispatch contract. If it enumerates accepted values, intersect the sets. If it accepts arbitrary strings, a bounded real subagent probe is required for conclusive dispatch validation; obtain the user's approval before a probe that may consume quota.
5. Ask whether the new mapping should be **project-scoped** or **user-scoped**. Explain that a committed project profile is shared and available to cloud agents whose checkout includes it, while a user profile is reusable locally across projects but is not synchronized to cloud agents.
6. Ask only for the outcome preferences needed to choose among validated candidates, such as cost, speed, and quality. Explain material trade-offs and offer `inherit` for every tier.
7. Propose complete `fast`, `balanced`, and `frontier` definitions in the current harness's native shape. Preserve every exact string and field name exposed by that harness.
8. Validate the complete current-harness section against the shared contract. Track profile/schema validity, account/catalog visibility, and dispatch compatibility separately.
9. Show the selected scope, exact target path, proposed YAML, and validation state for each tier. Obtain explicit approval before creating or changing the selected profile. Warn that a project profile may be committed and shared; a user-scope write outside the current workspace may require harness approval.
10. Write `version: 1` and `harnesses` as defined in the shared contract. Replace only the current-harness section in the selected profile and preserve its unrelated harness sections. Do not copy sections from the lower-priority profile into the selected file. Persist a concrete tier only when both catalog and dispatch validation succeeded; explicit `inherit` needs no model probe.
11. Re-read both profiles, validate the saved target again, resolve precedence again, and report the effective current-harness mapping and source. Never claim a write or validation that did not succeed.

## Validation outcomes

Use these terms precisely:

- `catalog-validated` — the exact model and its parameters are visible through a current first-party account-aware source.
- `dispatch-validated` — the exact harness-native definition is accepted by the current live subagent dispatch surface.
- `unverified` — either validation layer is unavailable, inconclusive, stale, or failed.

A concrete tier is persistable only when it is both `catalog-validated` and `dispatch-validated`. A main-agent model picker or catalog alone is not proof of subagent compatibility. Plan limits, organization policy, provider configuration, and model retirement can still change runtime eligibility.

Never translate, normalize, guess, or silently substitute a model identifier. If a concrete value cannot be fully validated, offer `inherit` or leave the existing file unchanged.

## Output

Report:

- detected harness, selected scope and profile path, and effective source;
- mode and whether the file changed;
- `fast`, `balanced`, and `frontier` exact definitions;
- catalog and dispatch validation state for every concrete tier;
- any unavailable checks, runtime eligibility caveats, or need to reconfigure.
