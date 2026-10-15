# How Buddy works

This page explains the contracts behind Buddy's workflow: what each stage produces, how specifications reach workers, how review and learning work, and how Buddy selects models. For installation and first use, see the [README](../README.md).

## Workflow contracts

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

## Stages

The [`develop`](../skills/develop/SKILL.md) skill coordinates the workflow. It selects only the stages the task needs, carries their artifacts forward, and asks the harness to select an available model for the fast, balanced, or frontier tier. A narrow, decision-complete fix can go directly to implementation; larger or ambiguous work gets the research and specification it needs before code is touched.

Each skill keeps its activation, boundaries, and handoff rules concise, with explicit loading conditions for supporting references. Implementation loads only the relevant language overlay; change reports load diagram details before authoring diagrams. This keeps task context focused while preserving permissions, ownership, retry limits, and verification gates.

| Stage | What Buddy produces | Default model role |
|---|---|---|
| **Research** | Persisted findings, evidence, and unknowns | Balanced; caller selects fast or frontier when warranted |
| **Innovate** | Meaningfully different solution directions | Balanced; frontier for difficult judgment |
| **Specify** | A decision-complete implementation contract | Frontier |
| **Implement** | One effective brief and integrated validation evidence | Adaptive: balanced for normal non-mechanical work; fast for mechanical work; frontier for retained technical judgment |
| **Verify** | Test results and observable delivery evidence | Balanced; fast for mechanical checks |
| **Review** | Evidence-backed findings, remediation status, and confirmed prevention rules | Fresh independent reviewer; frontier unless explicitly overridden |

`develop` always reviews implementation changes, including after remediation; failed validation does not waive review, and both must pass before completion.

The focused skills return after their own stage. A focused skill remains active for follow-ups until the user or a calling `develop` workflow explicitly selects another skill.

## Research briefs

Research keeps the current state of the work in one document that is as short as its relevant content allows. There is no word limit, so Buddy never drops or refuses a still-relevant finding to save space. The brief records what is true and relevant now, not how the investigation got there.

Each update checks new evidence against the whole brief. Buddy corrects or removes findings that the evidence invalidates, so obsolete conclusions do not remain beside new ones. A new follow-up question does not replace an earlier one: questions whose answers still affect the work keep their outcomes and evidence until they are answered and no longer matter, their premise is disproved, or you drop them. When an update removes or reverses a material finding, Buddy tells you which one and why.

An optional `PAST DECISIONS` section keeps at most three decisions or constraints that still apply. An optional `REJECTED` section lists, one line each with its reason, the ideas, options, and explanations that you or the evidence ruled out, so the rest of the brief holds only what still matters and settled ideas are not explored again. `innovate` adds its options to an `INNOVATION` section when you pass it a research brief and moves options you rule out to `REJECTED`. Evidence links preserve access to detail without copying it into the report.

For example, ask: “Research how customer authorization works.” Then ask: “Can archived customers be returned?” Both questions stay in the same brief:

```markdown
## QUESTIONS
- Q1: Does the customer endpoint already use the shared authorization contract?
- Q2: Can the customer endpoint return archived customers?

## OUTCOME
- Q1: Yes. The endpoint uses the shared middleware and response type.
- Q2: No. The repository query filters archived rows before authorization runs.

## FINDINGS
- Q1: The customer endpoint already uses the shared authorization middleware.
- Q1: Existing API responses follow `CustomerResponse`.
- Q2: `CustomerRepository.list` always adds `archived = false`.

## UNKNOWNS
- Q2: Do any internal callers expect archived customers?
```

## Specifications

Once decisions are settled, the specification records one shared contract and compact phase deltas:

````markdown
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

The host resolves the referenced requirement and success-criterion text plus the verification entries that name those criteria when it dispatches the phase. A phase names only criteria it establishes at completion; later-lifecycle rechecks use distinct terminal criteria. Global boundaries and verification remain inherited and are not copied into every delta. Phase references must cover every outcome in the goal; optional fields may only narrow, route, or make that work deterministic and are removed when the shared contract already implies them. Explicit relationships are omitted when listed sequential order already expresses them. The same worklog adds a **Decision Log** only for material choices and an **Agent Log** only when execution records compact current-revision evidence. A phase writes its Agent Log checkpoint after its integrated criteria pass. Any native Goal stays active until all phases and final verification pass.

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

## Brainstorm documents

[`brainstorm`](../skills/brainstorm/SKILL.md) starts in chat, asks one to three meaningful questions at a time, and challenges assumptions. It creates a document only after answers provide enough useful information to preserve, or when you ask to save. Some sessions stay entirely in chat. Once created, one living document at `docs/brainstorming/<YYYY-MM-DD>-<idea-slug>.md` keeps decisions, rationale, assumptions, edge cases, and open questions updated at meaningful checkpoints. The filename retains its creation date across updates. This is idea documentation, not a development worklog or technical specification. Say that the idea is fine for now to pause; an existing document gets a final checkpoint, but pausing alone does not create one.

When you return to the same idea, Buddy resumes its matching document and revisits older assumptions in light of new information. It keeps one document across sessions instead of creating a file for each discussion round.

Brainstorming defaults to balanced; the caller can select frontier when difficult reasoning warrants it. Explicit model requests take precedence. When a worker supplies reasoning, the host relays the discussion and maintains its document. The skill starts no development stage automatically.

## Model selection

Buddy recommends balanced, except for specification and code review, which recommend frontier. The caller can choose another tier when the work warrants it. Your harness selects the model and supported reasoning effort from its available choices:

| Tier | What the work needs | Selection intent |
|---|---|---|
| **Fast** | Bounded facts, routine checks, or deterministic transformations | Efficient, low-cost, low-latency model adequate for the task |
| **Balanced** | Normal coding, investigation, and local technical choices | Capable general-purpose coding model with suitable reasoning effort |
| **Frontier** | Architecture, ambiguity, difficult algorithms, or broad technical judgment | Highly capable model with stronger supported reasoning when useful |

No model setup is required. Codex, Claude Code, and Cursor use their own available choices and model descriptions to select for each tier. Model names and premium speed options do not guarantee lower cost, and the same model can serve more than one tier with different effort. See the shared [model selection rules](../skills/develop/model-selection.md) for native execution limits.

To override the recommendations, name an available agent, tier, model, or effort when invoking a skill. Replace `AGENT` and `MODEL` with choices available in the current tool:

> Research how customer search currently works. Use AGENT with the fast tier and MODEL.

> Develop customer search with filters and pagination. Use MODEL for review.

Your request overrides skill and phase selection recommendations, even for lower capability. A more specific stage request wins; a concrete model request wins over a tier recommendation. Selection does not change phase instructions, permissions, or verification. Native dispatch and effort controls remain authoritative. If a requested choice cannot run through the current interface, Buddy reports the limitation instead of silently replacing it.

## Cursor Goal tracking

During `implement`, including implementation that `develop` starts, Buddy tries once to open one native Cursor Goal for the run's outcome. You can track that run without typing a goal each time. Cursor can still refuse the call: its Goal tool is for an explicit user request, and Buddy's always-on rule cannot force the tool to accept. If Cursor refuses or the tool is missing, Buddy keeps the same outcome as a checklist and continues. On Cursor, the worker then tries once to open a Goal on its own agent; if that tool is missing or Cursor refuses, the worker continues and reports it. That Goal belongs to the worker. Task accepts only prompt text, and UpdateGoal changes only the calling agent's Goal, so the worker cannot close the parent's. Codex and Claude have no agent-callable Goal tool, so they keep that one parent checklist. Typing `/goal` in those products starts a separate keep-working loop and is left to you. Opt out by saying you do not want Goal tracking.
