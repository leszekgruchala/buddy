<p align="center">
  <img src="assets/buddy.svg" width="144" alt="Blueprint Buddy">
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

Buddy reserves frontier reasoning for architecture, ambiguity, and difficult decisions before implementation, and for substantial cross-cutting technical or algorithmic judgment inside a fixed implementation phase. Research defaults to balanced; the orchestrator keeps the user-selected model. Balanced is the normal implementation tier. Fast is only for deterministic transformations with no remaining technical judgment.

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

The [`develop`](skills/develop/SKILL.md) skill coordinates the workflow. It selects only the stages the task needs, carries their artifacts forward, and assigns the configured fast, balanced, or frontier model for each kind of work. A narrow, decision-complete fix can go directly to implementation; larger or ambiguous work gets the research and specification it needs before code is touched.

| Stage | What Buddy produces | Default model role |
|---|---|---|
| **Research** | Persisted findings, evidence, and unknowns | Balanced; fast for bounded facts |
| **Innovate** | Meaningfully different solution directions | Frontier |
| **Specify** | A decision-complete implementation contract | Frontier |
| **Implement** | One effective brief and integrated validation evidence | Adaptive: balanced for normal non-mechanical work; fast for mechanical work; frontier for retained technical judgment |
| **Verify** | Test results and observable delivery evidence | Appropriate to the check |
| **Review** | Evidence-backed findings, remediation status, and confirmed prevention rules | Frontier independent reviewer (required) |

Model names are configured separately for each supported tool. Buddy resolves the requested role through a project profile, a user profile, or maintained packaged defaults. Reviews require a concrete frontier model; an inherited or unavailable mapping blocks review instead of lowering the tier. Other stages retain their orchestrator-model fallback. `develop` always reviews implementation changes, including after remediation; failed validation does not waive review, and both must pass before completion.

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

After a fixed finding passes full validation and a fresh review confirms it, the
reviewer may add a short prevention rule to `.ai/memory/memory.md`. Specification and
implementation stages read this optional file as advisory guidance only; user and
repository instructions and security policy take precedence.

## Install

<details open>
<summary><strong>Codex CLI</strong> — GitHub marketplace</summary>

Add Buddy's GitHub repository as a marketplace, then install the plugin:

```bash
codex plugin marketplace add leszekgruchala/buddy --ref main
codex plugin add buddy@buddy
```

Restart Codex and start a new task. In the CLI, open `/hooks` and review and trust Buddy's `PreToolUse` hook if prompted; you can also do this from the desktop app. Add the marketplace only once; refresh its Git snapshot later with:

```bash
codex plugin marketplace upgrade buddy
```

</details>

<details>
<summary><strong>ChatGPT desktop app</strong> — Plugin Directory</summary>

After adding Buddy's marketplace through the Codex CLI, restart the desktop app. Buddy should appear in **Plugins** under the **buddy** marketplace.

Marketplace configuration is shared between Codex CLI and the desktop app, but installation is handled separately for each environment. Open Buddy and select **Install** in the desktop app.

When using Buddy in Codex, review and trust its `PreToolUse` hook from the desktop app.

</details>

<details>
<summary><strong>Claude Code</strong> — GitHub marketplace</summary>

Add the marketplace and install Buddy from an interactive Claude Code session or your terminal:

```bash
claude plugin marketplace add leszekgruchala/buddy@main
claude plugin install buddy@buddy
```

Restart Claude Code, or run `/reload-plugins`, before starting work with Buddy. The shared `PreToolUse` hook is installed automatically.

</details>

<details>
<summary><strong>Cursor</strong> — Marketplace or local folder</summary>

**Marketplace:** Once Buddy is published, open the [Cursor Marketplace](https://cursor.com/marketplace), find **Buddy**, and install it from **Customize**.

**Local folder:** Until then, place a copy of the plugin under `~/.cursor/plugins/local/`.

macOS or Linux:

```bash
git clone https://github.com/leszekgruchala/buddy.git
mkdir -p ~/.cursor/plugins/local
rsync -a --delete --exclude .git buddy/ ~/.cursor/plugins/local/buddy/
```

After pulling updates, rerun the `rsync` command.

Windows PowerShell:

```powershell
git clone https://github.com/leszekgruchala/buddy.git
robocopy buddy "$env:USERPROFILE\.cursor\plugins\local\buddy" /MIR /XD .git .ai
```

After copying or updating the local folder, reload the Cursor window with **Developer: Reload Window**. Confirm Buddy is enabled under **Customize → Plugins**, then check the **Hooks** output channel for its `PreToolUse` activity. If it is missing, toggle Buddy off and on, or recopy the checkout and reload.

Buddy's Cursor Rule requests one native Goal for an active `implement` run. It removes repeated prompt wording only when Cursor's native policy accepts persistent rule guidance; an explicit-user-only policy still uses Buddy's harness fallback.

For CLI-only testing against your checkout, start a new agent with:

```bash
cursor-agent --plugin-dir /path/to/buddy
```

</details>

### Destructive-command guard

Buddy bundles a shell guard that blocks destructive infrastructure, container, cloud, database, SQL, and unsafe file-removal commands before they execute. Direct removal is allowed only for explicit literal targets inside the active Git worktree.

The initial verified runtime is macOS 10.15 or newer and requires:

- `/bin/zsh`;
- `jq` on `PATH` or in a standard Homebrew/system location;
- `git` on `PATH` or in a standard Homebrew/system location.

If the hook cannot parse its input or find a required dependency, it blocks shell execution and tells the agent not to retry or work around the policy.

For a safe denial check, ask the agent to run `terraform apply -help`. Buddy should block it before Terraform starts. The hook is not yet guaranteed in Cursor Cloud Agents: Cursor currently documents repository, team, and enterprise hooks as its cloud-visible hook sources, but not hooks bundled inside an installed plugin.

## Setup

Buddy works with maintained packaged model defaults. To tailor them after installation, ask:

> Configure the models Buddy should use

or just

> /configure-models

Buddy will help select the fast, balanced, and frontier roles available in the current tool. Configuration can be saved to:

- `.buddy/model-profile.yaml` for project-specific choices that can travel with a committed checkout;
- `~/.buddy/model-profile.yaml` for reusable local preferences across projects.

Project configuration takes precedence for that tool. A local user profile does not travel automatically to cloud workers. See [`configure-models`](skills/configure-models/SKILL.md), the [model profile contract](skills/model-policy/reference.md), and [Cursor Task dispatch discovery](skills/model-policy/cursor-task-dispatch.md) for the exact behavior.

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
| [`research`](skills/research/SKILL.md) | Investigate facts and preserve the findings without changing product code. |
| [`innovate`](skills/innovate/SKILL.md) | Compare meaningfully different solution directions. |
| [`spec`](skills/spec/SKILL.md) | Turn settled decisions into a decision-complete contract. |
| [`implement`](skills/implement/SKILL.md) | Build a narrow request or execute one approved specification phase. |
| [`test-runner`](skills/test-runner/SKILL.md) | Discover and run the relevant validation. |
| [`configure-models`](skills/configure-models/SKILL.md) | Choose the fast, balanced, and frontier models for the current tool. |
| [`archive-worklogs`](skills/archive-worklogs/SKILL.md) | Archive completed development worklogs. |
