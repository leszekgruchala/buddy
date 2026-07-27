# Configurable Buddy model profile

## SUMMARY

Add a focused `configure-models` skill that helps a user select and validate exact models for the current harness, persists the selected current-harness section in a project or user profile, and makes `model-policy` resolve project, user, then packaged defaults without editing installed plugin files.

## REQUIREMENTS

1. Keep Buddy's stage-to-tier policy separate from user model preferences.
2. Add one user-facing `configure-models` skill; do not add named profiles or general Buddy settings.
3. Support the same versioned profile schema at project `.buddy/model-profile.yaml` and user `~/.buddy/model-profile.yaml`.
4. Store one optional section per harness and require `fast`, `balanced`, and `frontier` in every configured harness section.
5. Preserve exact harness-native dispatch representations:
   - Cursor uses an exact scalar model value, including any supported thinking, effort, speed, or bracket parameters.
   - Codex uses `model` plus optional `model_reasoning_effort`.
   - Claude Code uses `model` plus optional `effort`; do not claim per-subagent thinking control.
6. Let `inherit` replace a complete tier definition.
7. Configure only the current harness and preserve other harness sections.
8. Validate profile shape, account/catalog visibility, and live subagent dispatch compatibility separately.
9. Use current first-party, account-aware discovery when available and verify current CLI help before invoking a documented command.
10. Never translate, normalize, guess, or silently substitute model identifiers.
11. Persist only a complete current-harness mapping whose non-`inherit` tiers are validated for the live dispatch surface.
12. Revalidate stored values before dispatch; when a saved value is no longer accepted, omit the override, inherit, and report that reconfiguration is needed.
13. Resolve current-harness sections in project, user, then packaged-default order.
14. Preserve packaged model mappings as the no-profile default and recommend configuration non-blockingly once per top-level workflow.
15. Document that a committed project profile can reach cloud checkouts while the local home profile survives plugin updates but is not automatically available to cloud or remote workers.
16. Document verified local Codex and Cursor refresh workflows.

## SUCCESS CRITERIA

- `skills/configure-models/SKILL.md` defines a focused configure, reconfigure, inspect, and validate workflow with an explicit cross-skill gate.
- `skills/model-policy/SKILL.md` defines profile-aware resolution and runtime revalidation while remaining reference-only.
- One shared profile contract documents the exact schema, replacement semantics, validation states, and per-harness shapes.
- README documents the user-visible setup flow, both storage scopes, precedence, and update-safe persistence without introducing named profiles or broader settings.
- Harness compatibility documentation records discovery and validation boundaries for Codex, Cursor, and Claude Code.
- Harness compatibility documentation records verified local Codex and Cursor refresh workflows.
- All changed text files end with exactly one newline and all local links resolve.
- `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py` passes for Agent Skills, Codex, Claude Code, and Cursor.
- `git diff --check` passes.

## OUT OF SCOPE

- Named budget, quality, startup, enterprise, or other selectable behavior profiles.
- Monthly budgets, parallelism, research depth, verification strictness, or general Buddy preferences.
- Plugin hooks, MCP servers, dashboard variables, cloud synchronization, or remote profile distribution.
- Editing harness model settings, organization allowlists, API keys, plugin caches, or installed plugin state.
- Guaranteed runtime availability when the harness exposes neither an enumerated dispatch contract nor an approved bounded probe.
- Changing plugin ids, versions, manifests, marketplaces, or named agents.

## CONSTRAINTS

- Shared skills must remain valid Agent Skills and portable across Codex, Claude Code, and Cursor.
- Every non-`develop` skill must contain `Do not activate another Buddy skill`.
- Installed plugin files are package artifacts, not preference storage.
- Home-directory writes may require user approval; failure to write must return the exact proposed profile without claiming persistence.
- Account catalog membership is not sufficient evidence of subagent dispatch compatibility.
- A bounded real probe may consume quota and therefore requires user approval.
- Current repository guidance and refreshed official harness documentation are authoritative.

## ASSUMPTIONS / OPEN QUESTIONS

- (empty)

## RISKS

- Harness catalogs and dispatch schemas may drift; mitigate by requiring live discovery during configuration and revalidation before every override.
- A generic home path may be unavailable in cloud or sandboxed environments; mitigate with project scope, report the boundary, and never claim a write that did not succeed.
- A committed project profile is shared policy rather than a private preference; mitigate by explaining scope before write and forbidding secrets.
- Claude Code lacks a verified noninteractive account model-list command; mitigate by accepting only a live dispatch enum, readable organization policy plus user confirmation, or an approved bounded probe.
- Overly permissive fallback could unexpectedly spend more; mitigate by using `inherit` rather than substituting another concrete model when a configured value fails.

## INPUTS

- `skills/model-policy/SKILL.md` — current tier definitions, packaged mappings, and dispatch discipline.
- `skills/develop/SKILL.md` — orchestration and integration contract.
- `scripts/validate.py` — repository-wide Agent Skills and harness validation.
- `README.md` — public workflow and installation documentation.
- `docs/harness-compatibility.md` — current cross-harness capability boundaries.
- `.ai/worklog/20260727_configure_models/research_harness_contracts.md` — refreshed official harness contracts and verified CLI evidence.

## VERIFICATION COMMANDS

- project: buddy
  compile: `n/a`
  lint: `git diff --check`
  test: `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`

## FILE TREE

- `skills/configure-models/SKILL.md` — user-facing current-harness setup and validation workflow.
- `skills/model-policy/SKILL.md` — profile-aware resolution and runtime fallback discipline.
- `skills/model-policy/reference.md` — shared single-profile schema and validation contract.
- `README.md` — concise public configuration instructions.
- `docs/harness-compatibility.md` — harness-specific discovery, representation, and persistence limitations.

## IMPLEMENTATION DETAILS

`configure-models` must be a focused specialist skill. It detects the current harness from the live runtime, reads the shared profile contract and both profile locations, discovers account-visible candidates using a current first-party interface, intersects them with the live subagent dispatch contract, asks the user for project or user scope and outcome preferences, proposes all three tiers, validates the complete current-harness section, obtains approval for the selected write, and preserves unrelated harness sections in that file. It must distinguish `catalog-validated`, `dispatch-validated`, and `unverified`; only `dispatch-validated` concrete values or explicit `inherit` may be persisted. If the dispatch schema accepts arbitrary strings, a bounded real probe is required for conclusive validation and must be approved before consuming quota.

The shared profile is version `1` with top-level `harnesses`. A configured harness section replaces packaged mappings for that harness and must define all three tiers. `inherit` is a complete tier value. Cursor tiers use exact scalar values. Codex tiers use either `inherit` or an object with `model` and optional `model_reasoning_effort`. Claude Code tiers use either `inherit` or an object with `model` and optional `effort`. Other harnesses may be documented later only after their native shape and account-aware validation path are verified.

`model-policy` resolves: explicit current-task override, project current-harness section, user current-harness section, packaged defaults when neither section exists, then inherit if the selected definition is not accepted by the live dispatch interface. Precedence applies per harness section. When a higher-priority section exists, it fully replaces lower-priority mappings for that harness; invalid individual tiers inherit rather than falling back to a different concrete model. Runtime dispatch must preserve exact strings and field names exposed by the current harness.

The README should describe one command-like natural-language interaction, both profile paths, and their precedence. Harness compatibility should record the verified model and local refresh commands and their limitations without promising that a catalog proves dispatchability.

## PHASES

### Phase 1 — Implement the profile and resolver contracts

```yaml
id: 1
agent: implementor
tier: fast
reasoning_effort: medium
project: buddy
depends_on: []
parallel_with: []
files_touched:
  - skills/configure-models/SKILL.md
  - skills/model-policy/SKILL.md
  - skills/model-policy/reference.md
success_criteria:
  - `git diff --check`
  - `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`
out_of_scope:
  - README and harness compatibility prose
  - manifests, marketplaces, agents, hooks, MCP, or external plugin state
```

Subagent brief:

> Implement the decision-complete single-profile contract and user-facing configuration workflow exactly as specified. Keep `model-policy` reference-only, preserve packaged defaults, use progressive disclosure through one shared reference, and validate both Agent Skills structure and cross-harness definitions.

TODOs:
- [x] 1.1 Add the `configure-models` skill.
- [x] 1.2 Add the shared profile reference.
- [x] 1.3 Integrate profile resolution into `model-policy`.
- [x] 1.4 Validate phase 1.

### Phase 2 — Document setup and harness boundaries

```yaml
id: 2
agent: implementor
tier: fast
reasoning_effort: medium
project: buddy
depends_on:
  - 1
parallel_with: []
files_touched:
  - README.md
  - docs/harness-compatibility.md
success_criteria:
  - `git diff --check`
  - `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`
out_of_scope:
  - skill behavior changes
  - manifests, marketplaces, agents, hooks, MCP, or external plugin state
```

Subagent brief:

> Document the implemented single-profile setup concisely. Explain update-safe local storage, exact current-harness validation, catalog-versus-dispatch boundaries, and local/cloud limitations without adding future profile or general-preference concepts.

TODOs:
- [x] 2.1 Add concise README setup guidance.
- [x] 2.2 Update harness compatibility boundaries.
- [x] 2.3 Validate phase 2.

### Phase 3 — Independently validate the integrated change

```yaml
id: 3
agent: test-runner
tier: fast
reasoning_effort: low
project: buddy
depends_on:
  - 2
parallel_with: []
files_touched: []
success_criteria:
  - `git diff --check`
  - `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`
  - inspect final `git status --short` and diff for scope
out_of_scope:
  - modifying files or fixing failures
```

Subagent brief:

> Independently inspect and validate the completed diff against the spec and repository guidance. Run the required checks, report precise failures without editing, and confirm all harness definitions remain aligned.

TODOs:
- [x] 3.1 Run independent validation.
- [x] 3.2 Report coverage and blockers.

### Phase 4 — Add project scope, precedence, and local refresh guidance

```yaml
id: 4
agent: Main
tier: balanced
reasoning_effort: medium
project: buddy
depends_on:
  - 3
parallel_with: []
files_touched:
  - skills/configure-models/SKILL.md
  - skills/model-policy/SKILL.md
  - skills/model-policy/reference.md
  - README.md
  - docs/harness-compatibility.md
  - .ai/worklog/20260727_configure_models/spec_configure_models.md
success_criteria:
  - `git diff --check`
  - `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`
  - inspect final `git status --short` and diff for scope
out_of_scope:
  - named behavior profiles or general Buddy settings
  - manifests, marketplaces, agents, hooks, MCP, or installed plugin state
```

TODOs:
- [x] 4.1 Add project and user scope selection to `configure-models`.
- [x] 4.2 Add per-harness project, user, and packaged-default resolution to `model-policy`.
- [x] 4.3 Update the shared profile contract and public documentation.
- [x] 4.4 Document verified local Codex and Cursor refresh workflows.
- [x] 4.5 Validate the integrated follow-up.

## DECISION LOG

- 20260727 09:17: | Decision: Use one `~/.buddy/model-profile.yaml` with one section per harness. | Rationale: It survives plugin updates, keeps preferences user-owned, and avoids premature named-profile complexity.
- 20260727 09:17: | Decision: Preserve harness-native model representations instead of one universal slug shape. | Rationale: Cursor, Codex, and Claude Code expose different exact dispatch fields.
- 20260727 09:17: | Decision: Require both account/catalog visibility and live dispatch compatibility before persisting a concrete tier. | Rationale: Main-agent catalogs can be broader than subagent model support.
- 20260727 09:17: | Decision: A configured harness section is complete and replaces packaged mappings for that harness. | Rationale: Complete mappings and explicit `inherit` avoid hidden partial merges.
- 20260727 09:17: | Decision: Invalid configured tiers inherit rather than silently falling back to another concrete model. | Rationale: This prevents surprising cost or capability changes.
- 20260727 10:03: | Decision: Support project and user profile locations with per-harness project → user → packaged-default precedence. | Rationale: A committed project profile reaches cloud checkouts while a user profile remains a reusable local fallback.
- 20260727 10:03: | Decision: Missing profiles use packaged defaults and trigger one non-blocking configuration recommendation per top-level workflow. | Rationale: Default operation remains useful without making setup noisy or mandatory.

## AGENT LOG
- Phase 1 SUCCESS — Added the focused configuration workflow, shared single-profile contract, profile-aware resolver, current live inspection, and live-field reasoning dispatch; files: `skills/configure-models/SKILL.md`, `skills/model-policy/SKILL.md`, `skills/model-policy/reference.md`
- Phase 2 SUCCESS — Documented single-profile setup, update-safe local persistence, exact harness-native model representation, discovery-versus-dispatch validation, and local/cloud boundaries; files: `README.md`, `docs/harness-compatibility.md`
- Phase 3 SUCCESS — Independently validated the integrated change across Agent Skills, Codex, Claude Code, and Cursor; files: none
- Phase 4 SUCCESS — Added project/user scope selection, per-harness precedence, packaged-default notice, aligned profile documentation, and verified local Codex/Cursor refresh instructions; files: `skills/configure-models/SKILL.md`, `skills/model-policy/SKILL.md`, `skills/model-policy/reference.md`, `README.md`, `docs/harness-compatibility.md`, `.ai/worklog/20260727_configure_models/spec_configure_models.md`
