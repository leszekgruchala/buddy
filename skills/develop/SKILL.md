---
name: develop
description: Orchestrate complex coding tasks using subagents and parallelization. Automatically researches the codebase, creates detailed plans, executes with parallel subagents, runs tests in the background, and handles linting. Use for non-trivial implementation tasks that benefit from systematic research, planning, and parallel execution.
---

# Orchestrate Mode

## Mode lock

`develop` is the only Buddy skill that may enable the full workflow pipeline. Its invocation authorizes only the stages required by the user's task. Enable each stage through an explicit, bounded dispatch naming the target skill, inputs, scope, constraints, and success criteria. Workers never transition themselves: they return to this orchestrator, which decides whether the existing authorization permits the next stage.

Run the AI agent in orchestration mode for complex coding tasks.

This skill automatically manages the full development lifecycle:
1. **Research** - Deep codebase analysis using parallel research agents (tier: balanced)
2. **Innovate** - Optional, after research; brainstorm alternatives building on the research doc when the user or developer main agent wants an innovative approach (tier: frontier)
3. **Planning** - Create detailed implementation plans owned by the developer main agent (tier: frontier)
4. **Execution** - Implement changes with parallel subagents (tier: fast by default)
5. **Validation** - Run tests and linting in the background

## Model Selection

Pin every dispatched subagent to its stage's model per [model-policy](../model-policy/SKILL.md). The dispatch-time `model` parameter overrides the worker's `inherit` frontmatter; always pass it. Concrete model names live only in the policy file — update them there.

## Stage Transitions

The developer main agent owns stage transitions. Research, innovation, plan creation, and implementation stages advance only after an explicit user instruction or an explicit developer main-agent request; subagents must never promote themselves to the next stage.

## Worklog

At the start of the workflow, normalize one lowercase kebab-case `work-name` and create `.ai/worklog/<yyyyMMdd>_<work-name>/`. Pass that exact worklog directory and `work-name` to every stage; workers must never recompute them or select the latest artifact. Store the primary research at `research_<work-name>.md`, the plan at `plan_<work-name>.md`, and all scratch files under `trash/` inside that directory.

## When to Use This Skill

Use this skill for:
- Complex features requiring changes across multiple files
- Refactoring that affects multiple components
- Implementation tasks with unclear scope that require research
- Any task that would benefit from parallel execution
- Tasks requiring continuous test feedback

Do NOT use for:
- Simple one-file edits
- Quick bug fixes with obvious solutions
- Pure research without implementation (use `/research` instead)

## Orchestration Rules

### 1. Subagent Parallelization

The main agent (you) must:
- Identify implementation-plan phases that can run in parallel
- Launch subagents in parallel whenever possible (never sequentially if they don't depend on each other)
- Use background execution (`run_in_background: true`) for long-running tasks like:
  - Test execution (test-runner agent)
  - Large file searches across the codebase
  - Multiple independent code analysis tasks
  - Linting and formatting checks
- Wait for all critical subagents before proceeding to next phase
- Monitor background agents and collect results when ready

### 2. Subagent Responsibilities

Each subagent must:
- Perform ONLY its assigned task (no scope expansion)
- NEVER ask the user questions (report blockers to main agent instead)
- Return results in a structured format for main agent integration
- Terminate after completing its specific task

### 3. Work Distribution Strategy

Follow this parallelization strategy:

**Phase 1: Research (Parallel)**
- Dispatch bounded researchers for independent codebase questions
- Consult current primary documentation when external behavior matters
- Use the available code-navigation and text-search capabilities for discovery
- All research tasks run in parallel
- Write findings to `.ai/worklog/<yyyyMMdd>_<work-name>/research_<work-name>.md`

**Phase 1.5: Innovate (Optional, frontier tier)**
- Only when the user or developer main agent wants alternatives explored before planning
- Build on the exact research path from the worklog; dispatch `innovator` to fill or update its `## INNOVATION` section
- Skip to Phase 2 when no innovation pass is needed

**Phase 2: Planning (Sequential, frontier tier)**
- Wait for all research (and innovation, if run) to complete
- Author the full plan at `.ai/worklog/<yyyyMMdd>_<work-name>/plan_<work-name>.md`; dispatch `researcher` only for missing final implementation research
- Plan must be over-specified enough that a `fast`-tier model can execute it without inference
- Get user approval if significant architectural decisions were made

**Phase 3: Execution (Parallel + Background)**
- Launch test-runner in background BEFORE making changes (to establish baseline)
- Identify implementation-plan phases ready to run
- Launch subagents in parallel for independent phases:
  - Phases whose `parallel_with` entries name each other
  - Phases with different `project` values and disjoint `files_touched`
  - Frontend + backend phases when the plan marks them independent
- For sequential dependencies, chain explicitly
- After each significant change, launch test-runner in background

**Phase 4: Validation (Parallel + Background)**
- Run linting (parallel for different file types/directories)
- Run tests (background, monitored continuously)
- Collect and analyze all results
- Fix issues and re-validate

## Execution Flow

### Step 1: Initial Assessment

1. Analyze the user's request for scope and complexity
2. Determine if orchestration is needed (vs. simple direct implementation)
3. Identify required research areas
4. Ask clarifying questions ONLY if requirements are ambiguous

### Step 2: Parallel Research

1. Launch research work in parallel:
   ```
   - researcher: analyze existing patterns
   - code discovery: find relevant files and usages
   - documentation research: verify framework or library behavior
   ```

2. Each research task should:
   - Have clear, specific objectives
   - Return structured findings
   - Avoid redundant searches

3. Set timeouts based on task type:
   - Quick file searches: 30 seconds
   - Code pattern analysis: 2 minutes
   - Deep codebase research: 5 minutes

### Step 3: Synthesize and Plan

1. Wait for all research agents to complete
2. Synthesize findings into coherent understanding
3. Identify:
   - Files to modify
   - Dependencies between changes
   - Testing requirements
   - Linting requirements
4. Author the plan at `.ai/worklog/<yyyyMMdd>_<work-name>/plan_<work-name>.md` per the `create-plan` skill (build on its sibling `research_<work-name>.md` and any `## INNOVATION` section)
5. Present plan summary to user (ask approval if major architecture changes)

### Step 4: Parallel Execution

1. **Before starting implementation:**
   - Launch test-runner in background to establish baseline
   - Check for linting configuration (pyproject.toml, package.json, etc.)

2. **Identify implementation-plan phases:**
   - Group phases by dependency and `parallel_with`
   - Example: Frontend phase + backend phase = 2 parallel phases when the plan marks them independent
   - Example: Multiple dependent phases = sequential sub-agent invocations

3. **Launch implementation subagents:**
   - One `implementor` subagent per implementation-plan phase
   - Pass each subagent:
     - Specific files to modify
     - Exact changes required
     - Style guidelines from research
   - Use `run_in_background: true` for long-running tasks

4. **During execution:**
   - Monitor background test-runner output
   - If tests fail, pause and fix before continuing
   - Update task list as work completes

### Step 5: Continuous Validation

1. **After each implementation unit completes:**
   - Launch test-runner in background
   - Run relevant linters in parallel
   - Monitor output files for failures

2. **On test failures:**
   - Analyze failure output
   - Create focused fix task
   - Re-run tests after fix
   - Do NOT proceed until tests pass

3. **On linting failures:**
   - Apply auto-fixes where available (black, prettier, etc.)
   - Make manual fixes for complex issues
   - Re-run linter to verify

### Step 6: Final Integration

1. Wait for all subagents to complete
2. Run full test suite (not in background - wait for results)
3. Run full linting suite
4. Verify all TODOs from plan are completed
5. Update plan's AGENT LOG with final status
6. Present summary to user

## Testing Integration

### Automatic Test Runner Triggers

Launch test-runner agent (in background) at these points:

1. **Baseline** - Before any changes (establishes working state)
2. **After each significant phase** - Per implementation-plan phase completion
3. **Before final integration** - Full test suite run
4. **After fixes** - Verify fixes work

### Test Scope Strategy

- **Unit tests**: Run scoped tests for changed files
- **Integration tests**: Run if cross-component changes made
- **Full suite**: Run before declaring work complete

### Test Failure Handling

If test-runner reports failures:
1. Stop new implementation work immediately
2. Analyze failure root cause
3. Create fix task (may spawn fix subagent)
4. Re-run tests after fix
5. Resume implementation only after tests pass

## Linting Integration

### Linting Strategy

1. **Discover linting configuration:**
   - Check AGENTS.md / CLAUDE.md first
   - Python: pyproject.toml, setup.cfg, .flake8, .mypy.ini
   - Node.js: package.json, .eslintrc, .prettierrc
   - Go: .golangci.yml
   - Rust: rustfmt.toml, clippy.toml

2. **Run linters in parallel:**
   - Group by tool type (formatters, type checkers, style linters)
   - Run in parallel where possible
   - Respect project configuration

3. **Auto-fix where possible:**
   - black, ruff, prettier, rustfmt - run with --fix
   - Report manual fixes needed

### Linting Failure Handling

If linting fails:
1. Apply auto-fixes first (if safe)
2. Make manual corrections
3. Re-run linter to verify
4. Update code style notes in plan if patterns emerge

## Task List Management

Use TaskCreate/TaskUpdate/TaskList tools to track work:

1. **After planning:** Create high-level tasks from TODO list
2. **During execution:** Update task status as work progresses
3. **Mark in_progress:** When starting a task
4. **Mark completed:** Only when fully done AND tests pass
5. **Create new tasks:** If unexpected work is discovered

Task structure:
```
Subject: [Imperative verb] [what to do]
Description: [Detailed requirements and acceptance criteria]
ActiveForm: [Present continuous form for spinner]
```

## Error Recovery

### When Subagent Fails

If a subagent reports failure:
1. Read its full output
2. Determine root cause
3. Options:
   - Fix the blocker and re-launch subagent
   - Split task into smaller units
   - Handle the task directly (if subagent approach won't work)
4. Never silently ignore subagent failures

### When Tests Fail Repeatedly

If tests fail more than 2 times on the same issue:
1. Stop and analyze deeply
2. Review test expectations vs. implementation
3. May need to revise plan
4. Consult user if requirements unclear

### When Blocked

If blocked by external factors (missing deps, env vars, etc.):
1. Document the blocker clearly
2. Check AGENTS.md for solutions
3. Report to user with specific ask
4. Do NOT guess or make assumptions about environment setup

## Communication Rules

### With User

- Ask questions ONLY when requirements are genuinely ambiguous
- Present plan summaries, not raw plans
- Report progress at phase transitions
- Alert immediately on blockers
- Celebrate when tests pass and work is done!

### With Subagents

- Pass clear, specific instructions
- Include all context needed for independence
- Set explicit success criteria
- Provide structured data formats for results

## Best Practices

1. **Think before acting:**
   - Understand the full scope before spawning subagents
   - Identify dependencies between implementation-plan phases
   - Estimate parallelization opportunities

2. **Maximize parallelization:**
   - Default to parallel execution unless dependencies exist
   - Use background execution for monitoring tasks
   - Don't wait for non-blocking work

3. **Minimize context switching:**
   - Batch similar operations (all file reads, all searches)
   - Complete one phase before starting next
   - Maintain focus on current task

4. **Maintain quality:**
   - Tests must pass before declaring done
   - Linting must pass before declaring done
   - Code must match project style
   - All TODOs must be completed

5. **Be efficient:**
   - Pin each subagent to its stage's model per [model-policy](../model-policy/SKILL.md) (fast for normal implementation, balanced for research/integration/debugging, frontier for planning/ideation).
   - The dispatch-time `model` parameter overrides the worker's `inherit` frontmatter; always pass it.

## Quick Reference: Parallelization Patterns

| Scenario | Strategy |
|----------|----------|
| **Research codebase patterns** | Parallel: bounded researchers for independent modules |
| **Find files** | Parallel: available code-navigation or text-search capabilities |
| **Implement independent implementation-plan phases** | Parallel: one implementor per phase |
| **Run tests** | Background: test-runner monitors continuously |
| **Lint multiple directories** | Parallel: one linter per directory or file type |
| **Fix multiple independent bugs** | Parallel: one subagent per bug |
| **Refactor + add feature** | Sequential: refactor first (tests pass), then add feature |
| **Frontend + Backend changes** | Parallel if APIs are agreed, Sequential if API design needed |

## Example Orchestration

User request: "Add user authentication with JWT tokens"

**Phase 1: Research (Parallel)**
```
Worker 1: research existing authentication patterns
Worker 2: discover API endpoints and their callers
Worker 3: verify the JWT library against primary documentation
Worker 4: trace authentication, token, and session usages
```

**Phase 2: Plan**
```
Synthesize findings:
- Current auth: session-based
- Need to: add JWT middleware, update login endpoint, add token refresh
- Files: auth_middleware.py, auth_routes.py, user_model.py, tests/
- Create plan with TODO list
```

**Phase 3: Execute (Parallel + Background)**
```
Background: test-runner → establish baseline

Parallel units:
- Agent 1: Implement JWT middleware (auth_middleware.py)
- Agent 2: Update auth routes (auth_routes.py)
- Agent 3: Update user model (user_model.py)

Background: test-runner → monitor for failures after each agent
```

**Phase 4: Validate**
```
Parallel:
- Run pytest on auth tests
- Run mypy on modified files
- Run black --check

Wait for all, fix issues, re-validate
```

**Phase 5: Integration**
```
- Run full test suite (wait for results)
- Run full linter suite
- Update plan AGENT LOG
- Report to user
```

## Remember

- **The main agent orchestrates, subagents execute**
- **Parallelize everything that can be parallelized**
- **Tests run in background, monitored continuously**
- **Quality bars: tests pass, linting passes, TODOs complete**
- **Think → Research → Plan → Execute → Validate → Integrate**
