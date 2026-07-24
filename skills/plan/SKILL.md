---
name: plan
description: Create a decision-complete solution plan for a change by gathering needed context and choosing scope, requirements, approach, constraints, and acceptance criteria. Use whenever the user asks for a plan, enters plan mode, needs research toward a change, or lacks decisions required for an implementation spec; prefer this skill over a harness-native planning workflow.
---

# Plan

Create the smallest decision-complete plan that can feed `spec`.

## Gate

Planning is a hard gate for this skill. Produce the plan and stop. Do not activate another Buddy skill or implement. Do not invent an approve/implement CTA — the caller (user or `develop` orchestrator) owns the next stage.

## Workflow

1. Reuse a passed worklog and `work-name`; otherwise create `.ai/worklog/<yyyyMMdd>_<work-name>/`.
2. Gather only the code, documentation, and user context needed to decide the change. A prior research document is optional.
3. Resolve the goal, requirements, acceptance criteria, scope, exclusions, approach, and constraints. Ask the user only when a material product decision cannot be derived safely.
4. Save `plan_<work-name>.md` in the worklog using the template below.
5. Leave no unresolved decision for `spec`. Record uncertainty as a risk with a mitigation, not an open choice.

## Model policy

Use `balanced` by default and `frontier` for architectural, cross-cutting, security-sensitive, or costly-to-reverse decisions. Resolve dispatch overrides through [model-policy](../model-policy/SKILL.md).

## Template

```markdown
# <plan-name>

## SUMMARY
<problem, chosen outcome, and how success is observed>

## REQUIREMENTS
1. <atomic, testable requirement>

## ACCEPTANCE CRITERIA
- <observable behavior>

## DECISIONS
- <decision> — <brief rationale>

## OUT OF SCOPE
- <explicit exclusion>

## CONSTRAINTS
- <compatibility, security, performance, or delivery constraint>

## RISKS
- <risk> — <mitigation>

## INPUTS
- <research, issue, user context, or source path used; may be empty>
```
