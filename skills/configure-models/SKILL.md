---
name: configure-models
description: Configure, reconfigure, inspect, or validate Buddy's fast, balanced, and frontier models for the current Codex, Cursor, or Claude Code runtime. Use for model setup, cost/speed/quality optimization, active-profile inspection, or saved-model availability checks. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Configure Models

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Configure one current-product section in project `.buddy/model-profile.yaml` or user `~/.buddy/model-profile.yaml`; never change Buddy's stage-to-tier policy.

Before any mode, read and apply the complete [profile contract](../model-policy/reference.md).

## Gate

Work only with the live runtime; never infer another product or configure one this surface cannot validate.

Return after reporting. Do not dispatch project work, edit installed Buddy skills or plugin caches, or broaden into general settings.

## Modes

- **Configure/reconfigure:** discover candidates, settle and validate all tiers, then replace only the current-product section after approval.
- **Inspect:** show that section, effective source, and live validation without changes.
- **Validate** — re-run the saved-profile, account-availability, and Buddy-agent checks without changing the profile.

If the request is ambiguous, inspect first and ask whether the user wants to change the current model choices.

## Workflow

1. Detect Codex, Cursor, or Claude Code and its live native model/reasoning dispatch fields.
2. Safely parse both profile paths and resolve their current-product sections by the shared contract. On any parse failure, report and do not overwrite.
3. For configuration, verify CLI help, then use current first-party account-aware discovery. Preserve exact model identifiers and model-specific reasoning, effort, thinking, speed, context, bracket, or other native parameters.
   - For Cursor, explain before proposing choices that Buddy can use only the models and exact variants currently enabled in **Cursor Settings → Models**. Reasoning-effort and `Fast` variants are separate selectable definitions, not options Buddy can add independently. If the user later disables or changes a saved variant, Cursor subagents lose access to that concrete Buddy choice; Buddy must use `inherit` until the profile is reconfigured. Ask the user to enable a desired variant in Cursor first, then repeat discovery.
4. Validate candidates against live subagent dispatch as the contract requires, including approval before any quota-consuming probe.
5. Ask for **project** or **user** scope. Explain that committed project settings reach cloud checkouts and teammates, while user settings work locally across projects but are not synchronized remotely.
6. Ask only for the outcome preferences needed to choose among validated candidates, such as cost, speed, and quality. Explain material trade-offs and offer `inherit` for every tier.
   - Do not request mappings, YAML, or identifiers when discovery supplies validated candidates.
   - Use the user's language for quick (`fast`), everyday (`balanced`), and demanding (`frontier`) roles.
7. Propose all three definitions in exact native shape and validate schema, account availability, and Buddy-agent compatibility separately.
8. Show scope, exact target path, proposed YAML, and each role's readiness; warn about project sharing and possible approval for a user-file write outside the workspace. Obtain explicit approval before creating or changing a profile.
9. Write the contract's `version: 1` document, replacing only the selected file's current-product section and preserving unrelated sections. Never copy from the lower profile; persist concrete values only after both validations, while `inherit` needs no probe.
10. Re-read both files, revalidate the saved target, resolve precedence again, and report the effective section and source. Never claim an unsuccessful write or check.

Never translate, normalize, guess, or substitute identifiers. If a concrete value cannot be fully validated, offer `inherit` or leave the file unchanged.

## User-facing language

Never expose the contract's internal validation labels or unexplained `dispatch`, `catalog`, `harness`, `tier`, or `mapping`. Say:

- **Available to you** — `Yes` when catalog-validated; otherwise `Not confirmed`.
- **Ready for Buddy** — `Yes` when dispatch-validated; otherwise `Not confirmed`, followed by a short reason when known.
- Name Codex, Cursor, or Claude Code directly.
- Explain `inherit` as using the current Buddy task's model; show its exact value only in YAML or useful technical detail.
- For Cursor, say that the available models, reasoning-effort variants, and `Fast` variants come from **Cursor Settings → Models**, and warn that changing those enabled variants can make a saved Buddy choice unavailable to Cursor subagents.
- Say when a model is account-available but unconfirmed for Buddy agents, and explain known reasons briefly.
- Reserve implementation detail for requested diagnostics.

## Output

Report:

- product, scope, profile path, and effective source;
- mode and whether the file changed;
- exact definitions and both plain-language checks for every concrete role;
- any unavailable checks, runtime eligibility caveats, or need to reconfigure.
