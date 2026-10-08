<p align="center">
  <img src="assets/buddy-readme-hero.png" width="900" alt="Buddy development workflow: research, innovate, specify, implement, validate, and review, with a loop to fix findings">
</p>

# Buddy

> **Plan the work. Control the context. Ship with proof.**

Buddy is a structured development workflow for Codex, Claude Code, and Cursor. It turns an idea into durable research, a decision-complete specification, focused coding phases, independent review, and verified delivery.

Most coding agents investigate, decide, implement, and validate inside one growing conversation. Buddy gives each kind of work its own contract—and carries the useful context forward without carrying all the noise.

> **Planning is one stage. Buddy carries the work from idea to verified delivery.**

## Why Buddy?

### Research becomes project knowledge

Buddy records facts, evidence, and remaining unknowns while it investigates. Findings live in `.ai/worklog/`, so the next stage starts from inspectable project knowledge instead of repeating the conversation.

### Specifications agents can execute

Buddy records settled outcomes, requirements, success criteria, boundaries, and verification once in a shared contract. Compact phase deltas reference that contract instead of repeating it. Balanced and frontier workers discover files and form disposable runtime plans inside the settled boundaries.

### Small tasks get focused context

Instead of handing one agent an entire change, Buddy materializes an effective brief from the current shared contract and one bounded phase delta. The durable specification stays small while every worker still receives its applicable requirements, success criteria, boundaries, and evidence expectations.

### The right model handles the right work

Balanced is the common default. Specification and code review recommend frontier; for other work, the caller judges whether fast or frontier is warranted. Fast implementation is only for deterministic transformations with no remaining technical judgment. Each coding tool selects supported execution settings. Explicit agent, tier, model, and effort requests override Buddy's recommendations within their stated scope.

The phase tier follows the reasoning that remains inside the phase, not the mere existence of a specification.

### Delivery ends with evidence

Every phase references shared success criteria, and every criterion is named by at least one verification entry. Buddy resolves that evidence into the effective brief, runs it against the integrated revision, and records the outcome. A failed phase continues only with new evidence or a materially different hypothesis and within the original tier and ownership; otherwise Buddy stops or returns to specification. The result is not “the change should work”; it is a visible trail from question to verified delivery.

Buddy provides workflow guardrails, not a security boundary. Your coding tool's sandbox, permissions, and approval system remain authoritative.

## How it works

```text
idea
  → research the facts
  → settle the decisions
  → specify the implementation
  → execute focused phases
  → verify the result
  → review and remediate findings
```

The [`develop`](skills/develop/SKILL.md) skill coordinates the workflow. It selects only the stages the task needs, carries their artifacts forward, and asks the harness to select an available model for the fast, balanced, or frontier tier. A narrow, decision-complete fix can go directly to implementation; larger or ambiguous work gets the research and specification it needs before code is touched.

Each skill keeps its activation, boundaries, and handoff rules concise, with explicit loading conditions for supporting references. Implementation loads only the relevant language overlay; change reports load diagram details before authoring diagrams. This keeps task context focused while preserving permissions, ownership, retry limits, and verification gates.

| Stage | What Buddy produces | Default model role |
|---|---|---|
| **Research** | Persisted findings, evidence, and unknowns | Balanced; caller selects fast or frontier when warranted |
| **Innovate** | Meaningfully different solution directions | Balanced; frontier for difficult judgment |
| **Specify** | A decision-complete implementation contract | Frontier |
| **Implement** | One effective brief and integrated validation evidence | Adaptive: balanced for normal non-mechanical work; fast for mechanical work; frontier for retained technical judgment |
| **Verify** | Test results and observable delivery evidence | Balanced; fast for mechanical checks |
| **Review** | Evidence-backed findings, remediation status, and confirmed prevention rules | Fresh independent reviewer; frontier unless explicitly overridden |

No model setup is required. Codex, Claude Code, and Cursor use their own available choices and model descriptions to select for each tier. A user can request a model for a skill or a specific stage, including review. Native dispatch and effort controls remain authoritative; an unavailable explicit request is reported without silent substitution. `develop` always reviews implementation changes, including after remediation; failed validation does not waive review, and both must pass before completion.

## Explore an idea

Use [`brainstorm`](skills/brainstorm/SKILL.md) for a discussion about an idea's purpose, value, scope, and possible direction:

> Brainstorm a neighborhood tool-sharing service with me

Buddy starts in chat, asks one to three meaningful questions at a time, and challenges assumptions. It creates a document only after answers provide enough useful information to preserve, or when you ask to save. Some sessions stay entirely in chat. Once created, one living document at `docs/brainstorming/<YYYY-MM-DD>-<idea-slug>.md` keeps decisions, rationale, assumptions, edge cases, and open questions updated at meaningful checkpoints. The filename retains its creation date across updates. This is idea documentation, not a development worklog or technical specification. Say that the idea is fine for now to pause; an existing document gets a final checkpoint, but pausing alone does not create one.

When you return to the same idea, Buddy resumes its matching document and revisits older assumptions in light of new information. It keeps one document across sessions instead of creating a file for each discussion round.

Brainstorming defaults to balanced; the caller can select frontier when difficult reasoning warrants it. Explicit model requests take precedence. When a worker supplies reasoning, the host relays the discussion and maintains its document. The skill starts no development stage automatically.

## What Buddy leaves behind

Research is written as durable, reviewable evidence:

````markdown
## QUESTION
Does the customer endpoint already use the shared authorization contract?

## OUTCOME
Yes. The endpoint uses the shared middleware and response type.

## FINDINGS
- The customer endpoint already uses the shared authorization middleware.
- Existing API responses follow `CustomerResponse`.

## UNKNOWNS
- Should archived customers be returned?
```

Once decisions are settled, the specification records one shared contract and compact phase deltas:

```markdown
## REQUIREMENTS

- R1: Add the approved customer search endpoint.

## SUCCESS CRITERIA

- SC1: The endpoint returns the documented response shape and its focused tests pass.

## BOUNDARIES

- B1: Preserve the existing authentication and database contracts.

## VERIFICATION

- V1 [SC1]: `run the focused API tests`

## PHASES

```yaml
id: 1
goal: Add the customer endpoint with the settled behavior.
requirements: [R1]
success_criteria: [SC1]
```
````

`implementor` and `balanced` are defaults and stay out of the delta. Fast phases add a deterministic anchor or procedure only when the contract requires it. Frontier phases name their non-default tier and rationale. Balanced and frontier workers may choose files, local decomposition, implementation technique, and tests; their runtime plans are disposable.

The host resolves the referenced requirement and success-criterion text plus the verification entries that name those criteria when it dispatches the phase. A phase names only criteria it establishes at completion; later-lifecycle rechecks use distinct terminal criteria. Global boundaries and verification remain inherited and are not copied into every delta. Phase references must cover every outcome in the goal; optional fields may only narrow, route, or make that work deterministic and are removed when the shared contract already implies them. Explicit relationships are omitted when listed sequential order already expresses them. The same worklog adds a **Decision Log** only for material choices and an **Agent Log** only when execution records compact current-revision evidence. A phase Goal item completes after its integrated criteria pass and its Agent Log checkpoint is written.

Every spec requires final acceptance against all requirements and success criteria. A separate last acceptance phase is required unless the spec has one documentation or formatting phase with no behavior or public-contract change.

## Review and learning

Run `/review-code` to review an explicit local change. It returns concise findings with
severity, evidence, and remediation directly to the caller. It does not create a review
file by default or repeat snapshots, diff summaries, changed-file inventories, coverage
ledgers, or passing checks. A persistent report is written only when the user explicitly
requests one. The review still traces relevant callers and contracts, checks failure and
security paths, assesses tests, and does not edit production code. `develop` runs the same
independent review after implementation validation, sends open findings through the
existing implementation workflow, validates again, and re-reviews for at most two
rounds.

After a real finding is fixed, passes full validation, and is confirmed by a fresh
review, the reviewer may add one short, deduplicated prevention rule to
`.ai/memory/memory.md`. Clean reviews and open or blocked findings do not change this
memory. Specification and implementation stages read the optional rules as advisory
guidance only; user and repository instructions and security policy take precedence.

## Explain a code change

Use [`change-report`](skills/change-report/SKILL.md) to turn a pull request or branch diff into a short HTML report that explains what changed, why, who is affected, and which actions matter:

> Use change-report to explain PR #123 and its impact

> Use change-report to compare branch feature/customer-search with main

Reports group changes by feature in a **Before / After / Impact** table, with source evidence and visible warnings when information is missing. **High risk**, **Breaking change**, and **Human review** markers identify changes that need attention and state the next action. Fixes, user experience, documentation, tests, and maintenance are covered even when architecture stays the same.

When wiring or execution flow changes, optional **Before / After** diagram tabs, selectable components, and an **Execution flow** view explain the affected connections. Small changes skip diagrams and stay brief. Reports use one consistent layout, work offline, and remain beside the change in a matching `.ai/worklog/` diary; Buddy creates one if needed.

[Open the interactive sample report](https://gruchala.eu/buddy/examples/change-report.html), or [get its self-contained HTML file](docs/examples/change-report.html) for local use. The sample is a frozen development example.

## Install and update

<details open>
<summary><strong>Codex</strong> — Desktop and CLI</summary>

On the same machine with the same Codex configuration, desktop and CLI share plugin settings and installed files. Use these terminal commands for either client. See the [Codex plugin documentation](https://developers.openai.com/plugins/build/plugins).

**Install:** Add Buddy's GitHub repository as a marketplace once, then install the plugin:

```bash
codex plugin marketplace add leszekgruchala/buddy --ref main
codex plugin add buddy@buddy
```

**Update:**

```bash
codex plugin marketplace upgrade buddy
```

After installation or update, restart Codex desktop or start a new CLI session. Buddy appears in desktop **Plugins** under the **buddy** marketplace. Review and trust Buddy's `PreToolUse` hook if prompted, using `/hooks` in the CLI or the desktop app.

</details>

<details>
<summary><strong>Claude Code</strong> — GitHub marketplace</summary>

**Install:** Add the marketplace and install Buddy from an interactive Claude Code session or your terminal:

```bash
claude plugin marketplace add leszekgruchala/buddy@main
claude plugin install buddy@buddy
```

**Update:**

```bash
claude plugin marketplace update buddy
claude plugin update buddy@buddy
```

Restart Claude Code, or run `/reload-plugins`, before starting work with Buddy. The shared `PreToolUse` hook is installed automatically.

</details>

<details>
<summary><strong>Cursor</strong> — Git marketplace</summary>

**Install from the Git marketplace:** Register Buddy's repository:

```bash
cursor agent plugin marketplace add https://github.com/leszekgruchala/buddy
```

Open **Customize → Plugins**, find Buddy in the registered marketplace, and select **Install**.

**Update:**

```bash
cursor agent plugin marketplace remove buddy
cursor agent plugin marketplace add https://github.com/leszekgruchala/buddy
```

Then use `/plugin` to add Buddy, or open **Customize → Browse Marketplace → Add Buddy**. Reload the IDE window or restart Cursor.

Buddy's Cursor Rule requests one native Goal for an active `implement` run. It removes repeated prompt wording only when Cursor's native policy accepts persistent rule guidance; an explicit-user-only policy still uses Buddy's harness fallback.

</details>

### Destructive-command guard

Buddy bundles a shell guard that blocks destructive infrastructure, container, cloud, database, SQL, and unsafe file-removal commands before they execute. Direct removal is allowed only for explicit literal targets inside the active Git worktree.

Quoted heredoc input is treated as data for direct `cat`, `python -`, and `python3 -` commands. For example, a Python script supplied with `python3 - <<'PY'` can contain apostrophes without a false shell-syntax denial. The guard checks shell commands after the closing delimiter, so quotes in the body cannot hide a later destructive command.

This support is limited to one heredoc per opener line with a quoted identifier delimiter, an explicit closing delimiter, and a direct supported command. `<<-` can use tab-indented bodies and delimiters. A command can contain at most 16 supported heredocs and 64 surrounding shell lines. Nested shell strings support only an exact first option `-c`; startup, interactive, login, and combined options are blocked. Shell and database consumers, execution wrappers, expanding or multiple heredocs on the same line, and ambiguous surrounding shell syntax are blocked for manual review.

The initial verified runtime is macOS 10.15 or newer and requires:

- `/bin/zsh`;
- `jq` on `PATH` or in a standard Homebrew/system location;
- `git` on `PATH` or in a standard Homebrew/system location.

If the hook cannot parse its input or find a required dependency, it blocks shell execution and tells the agent not to retry or work around the policy.

For a safe denial check, ask the agent to run `terraform apply -help`. Buddy should block it before Terraform starts. The hook is not yet guaranteed in Cursor Cloud Agents: Cursor currently documents repository, team, and enterprise hooks as its cloud-visible hook sources, but not hooks bundled inside an installed plugin.

## Model selection

Buddy recommends balanced, except for specification and code review, which recommend frontier. The caller can choose another tier when the work warrants it. Your harness selects the model and supported reasoning effort from its available choices:

| Tier | What the work needs | Selection intent |
|---|---|---|
| **Fast** | Bounded facts, routine checks, or deterministic transformations | Efficient, low-cost, low-latency model adequate for the task |
| **Balanced** | Normal coding, investigation, and local technical choices | Capable general-purpose coding model with suitable reasoning effort |
| **Frontier** | Architecture, ambiguity, difficult algorithms, or broad technical judgment | Highly capable model with stronger supported reasoning when useful |

The harness makes this choice without asking you to configure a model for each tier. It uses current native descriptions and supported dispatch values. Model names and premium speed options do not guarantee lower cost, and the same model can serve more than one tier with different effort. See the shared [model selection rules](skills/develop/model-selection.md) for native execution limits.

To override the recommendations, name an available agent, tier, model, or effort when invoking a skill. Replace `AGENT` and `MODEL` with choices available in the current tool:

> Research how customer search currently works. Use AGENT with the fast tier and MODEL.

> Develop customer search with filters and pagination. Use MODEL for review.

Your request overrides skill and phase selection recommendations, even for lower capability. A more specific stage request wins; a concrete model request wins over a tier recommendation. Selection does not change phase instructions, permissions, or verification. If a requested choice cannot run through the current interface, Buddy reports the limitation instead of silently replacing it.

## Try it

For a complete change, give Buddy the outcome and let `develop` coordinate the workflow:

> Develop customer search with filters and pagination

That is enough. You can also invoke one focused stage when that is all you need:

**Research without changing code**

> Research how customer search currently works

**Create a decision-complete specification**

> Create a spec for customer search with filters and pagination

**Run an approved specification**

> /implement .ai/worklog/20260804_customer-search/spec_customer-search.md

The focused skills return after their own stage. `develop` is the end-to-end entry point that continues through implementation and verification.

A focused skill remains active for follow-ups until the user or a calling `develop` workflow explicitly selects another skill.

## Skills

| Skill | Use it to |
|---|---|
| [`develop`](skills/develop/SKILL.md) | Coordinate a non-trivial change from initial question to verified delivery. |
| [`brainstorm`](skills/brainstorm/SKILL.md) | Discuss and pressure-test an idea while maintaining living documentation. |
| [`research`](skills/research/SKILL.md) | Investigate facts and preserve the findings without changing product code. |
| [`innovate`](skills/innovate/SKILL.md) | Compare meaningfully different solution directions. |
| [`spec`](skills/spec/SKILL.md) | Turn settled decisions into a decision-complete contract. |
| [`implement`](skills/implement/SKILL.md) | Build a narrow request or execute one approved specification phase. |
| [`test-runner`](skills/test-runner/SKILL.md) | Discover and run the relevant validation. |
| [`change-report`](skills/change-report/SKILL.md) | Explain a PR or branch diff in a concise HTML report with before/after impact, evidence, review attention, and optional interactive diagrams. |
| [`archive-worklogs`](skills/archive-worklogs/SKILL.md) | Archive completed development worklogs. |
