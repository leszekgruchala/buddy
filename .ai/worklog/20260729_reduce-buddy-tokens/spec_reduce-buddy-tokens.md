# Reduce Buddy Prompt Tokens

## SUMMARY
Reduce Buddy's runtime prompt footprint file by file through concise wording and progressive disclosure, without removing any workflow, safety, model-selection, artifact, verification, or harness instruction.

## REQUIREMENTS
1. Audit every plugin file and classify it as runtime prompt material, discovery metadata, or non-runtime maintainer information.
2. Shorten every runtime-loaded skill, reference, and named-agent contract where wording or same-context duplication can be removed safely.
3. Preserve all existing triggers, stage boundaries, authorization gates, worklog paths, model tiers/defaults/profile semantics, spec fields, implementation safeguards, language rules, and validation/reporting behavior.
4. Keep independently loaded parent and worker contracts self-sufficient even when they describe related constraints.
5. Use references only for conditional detail and state exactly when each reference must be loaded.
6. Keep manifests, marketplaces, README, compatibility documentation, scripts, and repository guidance unchanged unless compatibility validation proves a contract update is required.
7. Measure before and after with the same `o200k_base` tokenizer and the current harness prompt-detail command.

## SUCCESS CRITERIA
- The combined `o200k_base` token count of `skills/**/*.md` and `agents/*.md` is below the 9,619-token baseline.
- `claude --plugin-dir . plugin details buddy` reports fewer always-on tokens than the approximately 830-token baseline.
- Each changed file preserves its pre-change atomic instructions or delegates them to an explicitly loaded, single source of truth.
- All skill quick validators and `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py` pass.
- Agent Skills, Codex, Claude Code, and Cursor validation required by current official guidance either passes or has an evidenced environment-only limitation.
- Text files retain exactly one trailing newline and `git diff --check` passes.

## OUT OF SCOPE
- Changing Buddy's plugin id, stage architecture, model choices, profile schema, worklog layout, manifest paths, marketplace identity, installation state, or documented CLI commands.
- Shortening maintainer-only prose that cannot reduce installed-plugin prompt use.
- Adding a new runtime abstraction, shared prompt include, or code-generated instruction system.

## CONSTRAINTS
- Follow current official Agent Skills, Codex, Claude Code, and Cursor contracts refreshed for this change.
- Keep `name` and trigger-complete `description` frontmatter in every skill and portable `name`/`description` agent frontmatter.
- Keep every `SKILL.md` under 500 lines and avoid reference nesting deeper than one level.
- Preserve the exact cross-skill gate required by the repository validator unless the validator is updated first from current official contracts.
- Do not mutate local plugin installation or marketplace registration.

## ASSUMPTIONS / OPEN QUESTIONS

## RISKS
- Over-compression can make a boundary implicit; mitigate with a pre/post semantic checklist per file and independent forward tests.
- Moving core rules to references can increase cost or cause missed instructions; move only conditional schemas/variants and keep operational routing in `SKILL.md`.
- Token estimates vary by harness; use both a fixed tokenizer comparison and Claude's live plugin detail estimate.

## INPUTS
- `AGENTS.md` — repository compatibility and validation requirements.
- Current official Agent Skills, Codex, Claude Code, and Cursor documentation — format and loading contracts.
- Baseline inventory from the research workers — runtime classification, token counts, and duplication clusters.

## VERIFICATION COMMANDS
- project: buddy
  compile: `n/a`
  lint: `git diff --check`
  test: `UV_CACHE_DIR=/tmp/buddy-uv-cache uv run scripts/validate.py`

## FILE TREE
- `skills/model-policy/SKILL.md` — concise runtime tier, profile-resolution, and dispatch policy.
- `skills/model-policy/reference.md` — profile configuration schema and validation reference.
- `skills/configure-models/SKILL.md` — configuration interaction workflow without reference duplication.
- `skills/develop/SKILL.md` — concise orchestration and continuity contract.
- `skills/research/SKILL.md` — concise factual-only stage contract.
- `skills/innovate/SKILL.md` — concise alternatives-only stage contract.
- `skills/spec/SKILL.md` — concise decision and specification gate.
- `skills/spec/reference.md` — unchanged-field compact spec template.
- `skills/test-runner/SKILL.md` — concise read-only validation and report contract.
- `skills/archive-worklogs/SKILL.md` — concise archival behavior.
- `skills/implement/SKILL.md` — concise direct/specified execution and verification gate.
- `skills/implement/reference.md` — compact deviation and engineering contract.
- `skills/implement/references/java-kotlin.md` — compact Java/Kotlin safeguards.
- `skills/implement/references/python.md` — compact Python safeguards.
- `skills/implement/references/typescript-javascript.md` — compact TypeScript/JavaScript safeguards.
- `agents/developer.md` — minimal controlling-skill entrypoint.
- `agents/researcher.md` — minimal controlling-skill entrypoint.
- `agents/innovator.md` — minimal controlling-skill entrypoint.
- `agents/implementor.md` — minimal controlling-skill entrypoint.
- `agents/test-runner.md` — minimal controlling-skill entrypoint.

## IMPLEMENTATION DETAILS
Treat descriptions as discovery metadata: retain what the skill/agent does and all user request classes that should trigger it, while removing explanatory clauses handled by the body.

Treat each `SKILL.md` as the operational contract loaded on activation. Keep non-obvious sequencing, gates, authorization, error limits, exact paths, and verification requirements. Remove prose explanations, repeated summaries, and model-resolution instructions from worker-only stages that cannot dispatch; retain their required tier as caller guidance.

Make `skills/model-policy/SKILL.md` the single runtime source for stage-to-tier mapping, packaged defaults, profile precedence, native override fields, fallback, and live dispatch checks. Keep `skills/model-policy/reference.md` as the configuration-time source for profile locations, complete schema, atomic replacement, persistence validation, and current first-party discovery. Make `configure-models` load that reference and contain only mode selection, user interaction/write sequence, and user-facing reporting rules not already defined there.

Keep orchestration and implementation copies of parallel-phase rules because they load in independent parent/worker contexts. Keep the `spec` phase schema fields unchanged. Keep implementation language overlays conditional and one level from `implement/SKILL.md`; preserve every language-specific prohibition or safeguard while combining related sentences.

Named agents must only identify and require their controlling skill before acting; stage boundaries already live in that necessarily co-loaded skill.

Do not edit non-runtime files merely to reduce repository byte count. Audit them and report them as unchanged.

## PHASES

### Phase 1 — Compress workflow and model contracts

```yaml
id: 1
agent: implementor
tier: fast
reasoning_effort: low
project: buddy
depends_on: []
parallel_with: []
files_touched:
  - skills/model-policy/SKILL.md
  - skills/model-policy/reference.md
  - skills/configure-models/SKILL.md
  - skills/develop/SKILL.md
  - skills/research/SKILL.md
  - skills/innovate/SKILL.md
  - skills/spec/SKILL.md
  - skills/spec/reference.md
  - skills/test-runner/SKILL.md
  - skills/archive-worklogs/SKILL.md
success_criteria:
  - All listed skills retain the file-specific contracts in IMPLEMENTATION DETAILS.
  - Every changed skill passes the Agent Skills quick validator.
  - git diff --check passes.
out_of_scope:
  - Implementation engineering contracts and named-agent entrypoints.
```

Subagent brief:

> Rewrite only the listed workflow/model files for lower prompt cost. Preserve every atomic behavior, trigger, gate, exact model/default/profile rule, worklog path, template field, and report requirement. Use progressive disclosure exactly as described above, avoid same-context duplication, validate each skill, and return the required implementor status.

TODOs:
- [x] 1.1 Rewrite the model-policy/configuration stack around one runtime and one configuration source of truth.
- [x] 1.2 Rewrite orchestration, stage, spec-template, validation, and archive contracts concisely.
- [x] 1.3 Validate every changed skill and whitespace.

### Phase 2 — Compress implementation contracts

```yaml
id: 2
agent: implementor
tier: fast
reasoning_effort: low
project: buddy
depends_on: [1]
parallel_with: []
files_touched:
  - skills/implement/SKILL.md
  - skills/implement/reference.md
  - skills/implement/references/java-kotlin.md
  - skills/implement/references/python.md
  - skills/implement/references/typescript-javascript.md
success_criteria:
  - Direct and specified modes, deviation stops, engineering safeguards, language rules, dispatch boundaries, and verification gates remain complete.
  - The implementation skill passes the Agent Skills quick validator.
  - git diff --check passes.
out_of_scope:
  - Other skills, agents, scripts, manifests, and maintainer docs.
```

Subagent brief:

> Rewrite only the implementation skill and its references for lower prompt cost. Keep the core workflow in SKILL.md, generic engineering rules in reference.md, and language-only rules in the conditional overlays. Preserve every existing safeguard and exact execution/report contract; combine wording without weakening it. Validate and return the required implementor status.

TODOs:
- [x] 2.1 Rewrite the implementation workflow and generic engineering contract.
- [x] 2.2 Rewrite each language overlay without losing a rule.
- [x] 2.3 Validate the skill and whitespace.

### Phase 3 — Compress named-agent entrypoints

```yaml
id: 3
agent: implementor
tier: fast
reasoning_effort: low
project: buddy
depends_on: [2]
parallel_with: []
files_touched:
  - agents/developer.md
  - agents/researcher.md
  - agents/innovator.md
  - agents/implementor.md
  - agents/test-runner.md
success_criteria:
  - Each agent retains trigger-complete discovery metadata and points to the correct controlling shared skill.
  - Agent bodies do not restate constraints already guaranteed by the controlling skill.
  - git diff --check passes.
out_of_scope:
  - Skills, manifests, marketplaces, and maintainer docs.
```

Subagent brief:

> Rewrite only the five named-agent entrypoints. Keep trigger-complete portable frontmatter and require loading the correct controlling skill before acting. Remove body rules duplicated by that necessarily loaded skill. Validate whitespace and return the required implementor status.

TODOs:
- [x] 3.1 Rewrite all five entrypoints.
- [x] 3.2 Validate skill pointers and whitespace.

## DECISION LOG
- 20260729 11:40: | Decision: Optimize only runtime prompt files; audit but do not shorten maintainer-only information. | Rationale: Repository byte reduction is not installed-plugin token reduction.
- 20260729 11:40: | Decision: Preserve independent parent/worker constraints even when text is similar. | Rationale: They may load in different contexts and must remain self-sufficient.
- 20260729 11:40: | Decision: Use the model-policy skill for runtime dispatch and its reference for profile configuration. | Rationale: This removes the largest same-context duplication without hiding required operational rules.

## AGENT LOG
- Phase 1 SUCCESS — compressed workflow/model contracts; independent audit corrections applied; files: `skills/model-policy/SKILL.md`, `skills/model-policy/reference.md`, `skills/configure-models/SKILL.md`, `skills/develop/SKILL.md`, `skills/research/SKILL.md`, `skills/innovate/SKILL.md`, `skills/spec/SKILL.md`, `skills/spec/reference.md`, `skills/test-runner/SKILL.md`, `skills/archive-worklogs/SKILL.md`
- Phase 2 SUCCESS — compressed implementation workflow, engineering contract, and language overlays; files: `skills/implement/SKILL.md`, `skills/implement/reference.md`, `skills/implement/references/java-kotlin.md`, `skills/implement/references/python.md`, `skills/implement/references/typescript-javascript.md`
- Phase 3 SUCCESS — reduced named agents to trigger metadata plus mandatory shared-skill loading; files: `agents/developer.md`, `agents/researcher.md`, `agents/innovator.md`, `agents/implementor.md`, `agents/test-runner.md`
