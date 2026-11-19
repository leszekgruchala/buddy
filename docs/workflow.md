# How Buddy works

This page explains the contracts behind Buddy's workflow: what each stage produces, how specifications reach workers, how review and learning work, and how Buddy selects models. For installation and first use, see the [README](../README.md).

## Workflow contracts

### Research becomes project knowledge

Buddy records facts, evidence, and remaining unknowns while it investigates. Findings live in `.ai/worklog/`, so the next stage starts from inspectable project knowledge instead of repeating the conversation. Research treats the request as a claim to test: it checks the premise and reaches primary evidence. For substantial work, it also tries to disprove its answer and maps what already solves the problem before anyone chooses an approach.

### Specifications agents can execute

Buddy records settled outcomes, requirements, success criteria, boundaries, and verification once in a shared contract. Compact phase deltas reference that contract instead of repeating it. Balanced and frontier workers discover files and form disposable runtime plans inside the settled boundaries.

### Small tasks get focused context

Instead of handing one agent an entire change, Buddy materializes an effective brief from the current shared contract and one bounded phase delta. The durable specification stays small while every worker still receives its applicable requirements, success criteria, boundaries, and evidence expectations.

### The right model handles the right work

Balanced is the common default. Specification and the judge recommend frontier; review uses balanced for small changes and frontier only for substantial or security-sensitive changes; for other work, the caller judges whether fast or frontier is warranted. Fast implementation is only for deterministic transformations with no remaining technical judgment. Each coding tool selects supported execution settings. Explicit agent, tier, model, and effort requests override Buddy's recommendations within their stated scope.

The phase tier follows the reasoning that remains inside the phase, not the mere existence of a specification.

### Delivery ends with evidence

Every phase references shared success criteria, and every criterion is named by at least one verification entry. Buddy resolves that evidence into the effective brief, runs it against the integrated revision, and records the outcome. A failed phase continues only with new evidence or a materially different hypothesis and within the original tier and ownership; otherwise Buddy stops or returns to specification. The result is not “the change should work”; it is a visible trail from question to verified delivery.

## Stages

The [`develop`](../skills/develop/SKILL.md) skill coordinates the workflow. It selects only the stages the task needs, carries their artifacts forward, and asks the harness to select an available model for the fast, balanced, or frontier tier. A narrow, decision-complete fix can go directly to implementation; larger or ambiguous work gets the research and specification it needs before code is touched.

Each skill keeps its activation, boundaries, and handoff rules concise, with explicit loading conditions for supporting references. Implementation loads only the relevant language overlay; change reports load diagram details before authoring diagrams. This keeps task context focused while preserving permissions, ownership, retry limits, and verification gates.

| Stage | What Buddy produces | Default model role |
|---|---|---|
| **Research** | Persisted findings, evidence, and unknowns | Balanced; caller selects fast or frontier when warranted |
| **Innovate** | The best viable, meaningfully different solution directions and a recommendation | Balanced; frontier for difficult judgment |
| **Specify** | A decision-complete implementation contract with the options it compared | Frontier |
| **Judge** | An independent ruling on each choice and irreversible-change signal in the spec; skipped when the spec has neither | Frontier, fresh context |
| **Implement** | One effective brief and integrated validation evidence | Adaptive: balanced for normal non-mechanical work; fast for mechanical work; frontier for retained technical judgment |
| **Verify** | Test results and observable delivery evidence | Balanced; fast for mechanical checks |
| **Review** | Evidence-backed findings, remediation status, and confirmed prevention rules | Size-dependent: none for trivial; balanced for small; frontier for substantial or security-sensitive |

Before routing, `develop` records the [change size](../skills/develop/change-size.md). Trivial changes stay on the host without independent review or a spec amendment. Small changes get one balanced review, with re-review only after a Medium or worse fix or an explicit request. Substantial changes keep the full review loop. Security-sensitive changes are at least small and use frontier review. New requests after completion are classified independently.

Focused skills return after their assigned stage. Keep clarifications within the current request; after completion, route a new request by its own scope and size.

## Depth gate

Before it writes a spec for substantial work, or for small work with two approaches that differ materially in cost or risk, the host reads the stage output and spot-checks the findings that decide the approach. The gate passes when the premise is tested and the real problem is identified, every finding that decides the approach rests on primary evidence, the best viable options are compared against the outcome (including any approach the request named), and each remaining unknown either cannot change the choice or has recorded failed attempts.

Open gaps start one targeted `research` or `innovate` round that covers them all, from a different angle. A run allows at most two extra rounds, and a round that adds no new evidence ends the loop, so depth has a cost limit. What stays open becomes a named assumption in the spec. When the evidence shows that the requested outcome would not solve the real problem, Buddy adds that comparison to the spec options, and the judge rules on it. When every option breaks one of your explicit constraints, Buddy asks you and names the constraint that each option breaks. Buddy asks you about no other choice: the judge rules on hard choices between viable options.

A spec that you pass to `develop` is already researched and approved. Buddy reuses its worklog and starts at implementation, without the gate, the judge, or an approval stop. It returns to `spec` only to amend a material choice that the spec leaves open or that implementation invalidates, and researches only that gap.

## Judge and continuation

When `develop` writes or amends a spec, it does not stop for approval. It scans the spec for irreversible-change signals, such as migrations, deleted public exports, changed formats, data deletion, or permission changes, and counts the spec options that compare more than one option. When it finds such an option entry or a signal, it starts a fresh [`judge`](../skills/judge/SKILL.md) on the frontier tier. When it finds neither, the judge has nothing to rule on: the host records `Judge: skipped, no choices or signals` in the spec and in the final report, and goes on to implementation without a judge call. The judge gets your request word for word, the instructions, your explicit constraints, and the artifact paths, but not the host's conversation or preferred options. It checks the deciding facts itself, adds signals that the host missed, and gives each choice one verdict: confirm, overturn, needs evidence (with a provisional pick), or ask the user.

The judge asks in only two cases. The first is an irreversible change: an option is breaking, irreversible after release, not requested, and has no viable reversible alternative, such as a deprecation, a two-step migration, a feature flag, or a new write location. That question must name the affected consumer or data, one category (`data`, `published contract`, `external state`, or `security`), why a revert does not restore the earlier state, why no reversible option works, and the judge's best pick. The second is a constraint conflict that the host missed: every option breaks one of your explicit constraints, and the question names the constraint each option breaks and the judge's best pick. When the spec already shows such a conflict, the host asks you itself, as the depth gate describes. The host checks these fields; a malformed question gets one fresh judge, and a second failure or an unavailable judge falls back to one spec approval. Ties, product preferences, evidence gaps, and reversible architecture changes never stop the run: the judge decides on the evidence, and when the evidence does not separate the options or a gap stays open with no rounds left, it picks the option that is easiest to undo and records the assumption.

An overturn or an evidence request starts one targeted research round, a spec amendment, and a new judge. These rounds share the depth gate's budget; when it ends, the latest rulings stand. Before completion, the host scans the integrated diff the same way. A new signal that neither the request nor a passed spec covers gets its own judge ruling outside the budget, on the amended spec or, for work without a spec, on the diff. Each ruling appears in the spec and in the final report with the fact that would change it. Add `Stop for spec approval.` to a request to approve the spec yourself after the judge rules; when the judge was skipped, the approval summary has no rulings. After the spec is settled, `develop` runs implementation, validation, review, and remediation to the end, and stops only for completion, a judge question, an action that needs authorization, no progress, or an environment failure.

The host keeps `.ai/worklog/<yyyyMMdd>_<work-name>/run-state.json` current with `status` (`running`, `awaiting_user`, `blocked`, or `complete`), `next`, an incrementing `seq`, and `review` (`required` or `passed`) when review is required. It writes the file with a shell command, not the file-edit tool, and marks the run `complete` in the turn that makes the last change. So the editor's agent-turn diff shows the work, not the run state. When the agent stops while the newest fresh run state is `running`, Buddy's Stop hook starts the next turn with the `next` step. A run marked `complete` while `review` is still `required` counts as `running`, and the hook asks for the review. The hook lets the agent stop when no run is active, the status is not `running` (or `complete` with a required review), `seq` did not change since its last continuation, the run reached 30 continuations, or the hook cannot read its input. See [harness compatibility](harness-compatibility.md#run-continuation-hook) for each tool.

## Dispatch

The host runs phases itself, in order, by default. Phases stay as verification and resume units, not as a reason to start subagents. A worker starts only for the judge, required independent review, declared parallel phases large enough that concurrency saves time, work that reads far more than it returns, or bulk mechanical work a cheaper model does equally well. A worker is an ordinary general-purpose subagent that loads the Buddy skill for its stage and gets the host's instructions, the goal or success criteria when there are any, and the result to return. Only the judge and the required reviewer are named agents, `judge` and `code-reviewer`, on Claude Code and Cursor; Codex starts a generic worker that loads the skill. The skill a request starts with, such as `develop`, owns the run; stage skills it loads follow its transitions. Buddy does not start harness-native orchestration, such as Claude Code dynamic workflows or agent teams, inside a run. The [dispatch-policy evaluation](../evals/cases/dispatch-policy/grading.md) compares this rule with host-only execution.

## Research briefs

Research keeps the current state of the work in one document that is as short as its relevant content allows. There is no word limit, so Buddy never drops or refuses a still-relevant finding to save space. The brief records what is true and relevant now, not how the investigation got there.

Research stops at a depth bar, not at the first plausible answer. A factual lookup or small work needs a premise check and primary evidence; substantial work or an unsettled approach also tries to disprove its answer and maps the solution space as facts. A failed search is not an unknown: for an unknown that could change an outcome, Buddy tries at least two other angles first, and each entry in `UNKNOWNS` says what was checked and what would settle it. Research never ranks or chooses.

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

Once decisions are settled, the specification records one shared contract and compact phase deltas. An `OPTIONS` section compares the best viable options for each material choice that had alternatives, states the chosen one and its deciding evidence, and names the fact that would change it. An explicit user constraint stays binding; when evidence shows that it harms the outcome, Buddy says so and does not silently replace it.

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

An omitted `agent` and `balanced` are defaults and stay out of the delta. Fast phases add a deterministic anchor or procedure only when the contract requires it. Frontier phases name their non-default tier and rationale. Balanced and frontier workers may choose files, local decomposition, implementation technique, and tests; their runtime plans are disposable.

The host resolves the referenced requirement and success-criterion text plus the verification entries that name those criteria when it dispatches the phase. A phase names only criteria it establishes at completion; later-lifecycle rechecks use distinct terminal criteria. Global boundaries and verification remain inherited and are not copied into every delta. Phase references must cover every outcome in the goal; optional fields may only narrow, route, or make that work deterministic and are removed when the shared contract already implies them. Explicit relationships are omitted when listed sequential order already expresses them. The same worklog adds a **Decision Log** only for material choices and an **Agent Log** only when execution records compact current-revision evidence. A phase writes its Agent Log checkpoint after its integrated criteria pass. Any native Goal stays active until all phases and final verification pass.

Every spec requires final acceptance against all requirements and success criteria. A separate last acceptance phase is required unless the spec has one documentation or formatting phase with no behavior or public-contract change.

## Testing and evidence reuse

The [test design contract](../skills/curate-tests/test-design.md) governs every test Buddy adds or changes. `implement` and `curate-tests` apply it. Only a direct `curate-tests` call may also refactor existing tests and remove clearly useless ones, and it records each change with its reason and keeps every protected behavior. `review-code` checks added tests against it. `implement` does not start `curate-tests`. It holds its own test rules, and a phase fails verification when a test edit has no `test-changes.md` record in the run's worklog with the contract load, the protected behaviors, each deleted or rewritten test, a break check, and a final check of the test diff for consistency, shared abstractions, coherence, and duplicates. A passing test run does not replace that record. In a `develop` run, `review-code` compares that file with the test diff and reports a missing record, an unrequested deletion or rewrite, and any test change that the record omits. Reuse or extend existing behavioral tests; add only distinct uncovered failures. For example, extend a retry test with partial failure rather than another successful retry. Inputs on the same path are one case; keep distinct causes separate. Zero new tests is valid.

Reuse passing checks under the [validation policy](../skills/develop/change-size.md#validate-and-review); rerun after relevant changes or explicit fresh-check requirements. The [implementation evaluation](../evals/cases/test-selection/grading.md) grades coverage reuse and fault detection; the [test design evaluation](../evals/cases/test-design/grading.md) grades abstraction reuse, boundaries, and redundant cases, and its curation cases grade removals that keep every protected behavior.

## Review and learning

Run `/review-code` to review an explicit local change. It returns concise findings with
severity, evidence, and remediation directly to the caller. It does not create a review
file by default or repeat snapshots, diff summaries, changed-file inventories, coverage
ledgers, or passing checks. A persistent report is written only when the user explicitly
requests one. The review still traces relevant callers and contracts, checks failure and
security paths, assesses tests, and does not edit production code. `develop` runs the same
independent review when the size policy requires it. Fixes rerun only the checks they
affect, and the full suite reruns after a fix only when it changed shared code or a public
contract. Remediation permits at most five
rounds of fixes and fresh review, and each round must close a finding or add evidence. Low-only fixes in small work use host verification.
Optional reviews need a short cost note and explicit agreement. Requests such as
"no review", "just change the text", or "quick fix" disable review and subagent dispatch
for that request. Short implementation work stays on the host; required independent
review is a dispatch exception. Trivial and small work run affected tests first; the
full suite runs at the end of substantial work or when shared code changed. Explicit
repository checks still apply.

After a real finding is fixed, passes size-scoped required validation, and is confirmed by a fresh
review, the reviewer may add one short, deduplicated prevention rule to
`.ai/memory/memory.md` and names it after the findings table. The caller passes each
re-reviewer the latest findings table, so that the reviewer can confirm fixes. Clean
reviews and open or blocked findings do not change this memory. The file lives in the main
checkout, so linked worktrees share it. Specification and implementation stages read the optional rules as advisory
guidance only; user and repository instructions and security policy take precedence.

## Brainstorm documents

[`brainstorm`](../skills/brainstorm/SKILL.md) starts in chat, asks one to three meaningful questions at a time, and challenges assumptions. It creates a document only after answers provide enough useful information to preserve, or when you ask to save. Some sessions stay entirely in chat. Once created, one living document at `docs/brainstorming/<YYYY-MM-DD>-<idea-slug>.md` keeps decisions, rationale, assumptions, edge cases, and open questions updated at meaningful checkpoints. The filename retains its creation date across updates. This is idea documentation, not a development worklog or technical specification. Say that the idea is fine for now to pause; an existing document gets a final checkpoint, but pausing alone does not create one.

When you return to the same idea, Buddy resumes its matching document and revisits older assumptions in light of new information. It keeps one document across sessions instead of creating a file for each discussion round.

Brainstorming defaults to balanced; the caller can select frontier when difficult reasoning warrants it. Explicit model requests take precedence. When a worker supplies reasoning, the host relays the discussion and maintains its document. The skill starts no development stage automatically.

## Model selection

Buddy recommends balanced. Specification and the judge recommend frontier. Review uses the size-dependent defaults above. The caller can choose another tier when the work warrants it. Your harness selects the model and supported reasoning effort from its available choices:

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
