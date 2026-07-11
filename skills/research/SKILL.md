---
name: research
description: Enable research-only mode for information gathering and analysis from the code bases or framework/library documentations. Use when the user asks to research a topic, gather context, read files, or understand code without making suggestions, emendations, and to remain in research mode until explicitly signaled to proceed.
---

# Research Mode

Conduct research and analysis on the topic provided by the user.

## Rules

1. Use for information gathering only.
2. Permit reading files, asking clarifying questions, and understanding code structure.
3. Forbid suggestions, implementations, planning, or any hint of action until explicitly signaled.
4. Seek only to understand what exists, not what could be.
5. Remain in this mode until the user or developer main agent explicitly signals the next mode.
6. Use parallel sub-agents to do the research efficiently where applicable.
7. If you need to create any intermediate files while conducting the research, use `.ai/trash` directory.
8. Follow-up messages from the user extend the research; they do not exit research mode. See [Mode lock](#mode-lock).

## Mode lock

Research mode is a hard gate. Once active, it stays active until the user or `develop` orchestrator gives an **explicit exit signal**. Do not activate another Buddy skill. Nothing else exits the mode — not a follow-up question, new feedback, "what about X", "also consider Y", "dig deeper into Z", or apparent completeness.

### Explicit exit signals (closed list)

The user or developer main agent must state, in intent, one of these to leave research mode:

- Switch to plan mode / create a plan / `/create-plan` → create-plan skill.
- Implement / implement this / `/implement` → implement skill.
- Innovate / brainstorm / `/innovate` → innovate skill.
- Develop / `/develop` → develop skill.
- An explicit instruction to write, edit, create, or delete files in the working tree.

When in doubt whether a message is an exit signal, it is **not** one. Ask the user to confirm the exit signal they intend; do not infer it.

### Follow-up messages

Any message that is not an exit signal extends the research: update the research document, run more searches, trace more symbols, ask clarifying questions. Do not start implementing, do not draft a plan file, do not write or edit source.

### Forbidden while in research mode

- Editing, creating, or deleting any file outside `.ai/research/` and `.ai/trash/`.
- Running shell commands that mutate the working tree, dependencies, or git state (commits, branches, installs, mutating builds).
- Producing a plan, a change TODO list, or an implementation outline as action. Reporting findings is fine; prescribing concrete edits to make is not.
- Invoking the create-plan, implement, develop, or innovate skills.

### Pre-action self-check

Before every non-read tool call, answer: *Is this a read, a clarifying question to the user, or a write inside `.ai/research/`|`.ai/trash/`?* If no, stop and re-read [Explicit exit signals](#explicit-exit-signals-closed-list). If the user's latest message was not an exit signal, do not proceed; ask them to confirm the signal they intend.

## Model policy

Research runs at the `balanced` tier. Resolve any model override through [model-policy](../model-policy/SKILL.md), and use it only when the live dispatch interface supports its exact value.

## Research memory

1. Create the `.ai/research/` directory if it doesn't exist.
2. File representation: markdown at `.ai/research/<ordering_number>_<research-name>.md`, strictly following the template below.
3. Use `yyyyMMdd` for `ordering_number`.
4. Upon user request:
   1. Store the outcome of the research in the `.ai/research` directory.
   2. If the document exists and while the research is ongoing update the research document.
5. Scratch, temporarily created files go in `.ai/trash/<research_name>`. Never commit, merge, or push them.

## Persistence

1. Operate as an agent and continue until the **research question** is fully answered and the research document is complete — not until the underlying engineering change is made.
2. Terminate your turn only when you are certain the research is complete or you have hit a blocker the user must resolve.
3. Do not stop the research when uncertain; research or deduce the most reasonable approach and continue.
4. Avoid asking the user to confirm or clarify assumptions that you can resolve by reading code or docs; make reasonable assumptions, proceed, and document them in the research file.
5. Do not create a plan until the user gives an explicit exit signal (see [Mode lock](#mode-lock)) and confirms all required information is gathered and clear.

## Context Gathering

1. Goal: parallelize discovery and stop as soon as you can act.
2. Search depth: high.
3. Method:
   1. Use the available documentation-retrieval capability and current primary sources for any framework or library. Use context7 MCP if available to obtain up to date documentation.
   2. Start with broad queries, then focus on subqueries iteratively.
   3. Launch varied queries in parallel; read top results per query.
   4. Deduplicate paths, cache results, and avoid repeating queries.
   5. Avoid redundant or excessive context searching; if needed, run a targeted batch of focused searches.
   6. If an edit partially fulfills the user's query but you are not confident, gather more information or use additional tools before concluding.
   7. Favor self-sufficiency over asking the user for input; seek answers independently where possible.
   8. Collect detailed information that will be used to build a plan.
4. Early stop criteria:
   1. Identify exact content to change.
   2. See top results converge (about 70 percent) on a particular area or path.
5. Escalate once: if signals conflict or scope is unclear, conduct one refined parallel batch, then proceed.
6. Depth: trace only symbols you plan to modify or whose contracts are relevant; avoid unnecessary expansion unless required.
7. Loop: batch search, then update the research document. Search again only if validation fails or new unknowns arise. Prefer thorough research over premature action — action is gated by an explicit exit signal from the user (see [Mode lock](#mode-lock)), not by your confidence that you could implement.

Once ready, ask the user for instructions. Then load into context whatever files are necessary to fulfill the user request, and conduct the research.

## Verification commands capture

When research feeds a plan, capture verification commands **per project** so the plan's `VERIFICATION COMMANDS` section can copy them verbatim. A "project" is the smallest scope at which build/lint/test runs cleanly in isolation (a repo, a Gradle/Maven module, an npm workspace, a per-package `pyproject.toml`, a Bazel package, or a per-language subtree in a polyglot monorepo). The implementer relies on this keying to keep parallel sub-agents from clobbering each other's build state.

For each project the plan will touch, record:

- compile: how to build/typecheck (`./gradlew :services:auth:build`, `pnpm --filter @org/web build`, `cargo check -p api`).
- lint: how to lint (`mise lint`, `ruff check packages/api`, `./gradlew :services:auth:detekt`).
- test: how to run tests (`pytest packages/api -q`, `./gradlew :services:auth:test`, `pnpm --filter @org/web test`).

Record them under a `## VERIFICATION COMMANDS` section in the research file, one block per project. Use `n/a` when a category truly does not apply.

Template:

```markdown
## VERIFICATION COMMANDS
- project: <id>
  compile: …
  lint: …
  test: …
- project: <id>
  compile: …
  lint: …
  test: …
```

For single-project repos, list exactly one entry.

## Research Template

Use this template exactly:

```markdown
# [Research name]

## SUMMARY
[research purpose, problem statement]

## OUTCOME
[research outcome broken by sub-topics, in a logical order, concise]

## INNOVATION
[reserved for the optional innovate phase; write "Not run" when no innovation pass was requested]

## VERIFICATION COMMANDS
- project: <id>
  compile: …
  lint: …
  test: …
```
