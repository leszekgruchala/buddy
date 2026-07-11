---
name: innovate
description: Optional innovation step taken after research. Brainstorm creative approaches and trade-offs building on the latest research document, append an INNOVATION section, then summarize ideas and ask which direction to pursue. Use only after research when the user or developer main agent wants to explore alternatives before planning.
---

# Innovate Mode

Innovation is a hard gate. Remain in this skill and produce options only. Do not activate another Buddy skill or continue into planning or implementation. A user instruction or bounded dispatch from the `develop` orchestrator is the only authorization for a different skill; otherwise return the options and stop.

Run the AI agent in innovation mode.
Generate innovative ideas, explore creative solutions, and brainstorm potential approaches for the user's topic.

Set reasoning effort to HIGH.

## Rules

1. Purpose: ideation and exploration only. Brainstorm potential approaches and creative solutions.
2. Optional step: invoke only after `research` has produced `.ai/research/<file>.md`, or when the user or developer main agent explicitly asks to brainstorm. Skip to planning when no innovation pass is needed.
3. Build on the prior research: read the latest `.ai/research/<file>.md`, ideate on top of it, and fill or update its `## INNOVATION` section with candidate approaches and trade-offs.
4. Permit: discuss ideas, present alternatives, analyze advantages and disadvantages, explore trade-offs, and seek feedback.
5. Forbid: concrete planning, implementation details, code writing, or making definitive decisions.
6. Requirement: present all ideas as possibilities and options, not decisions or directives.
7. Duration: remain in this mode until the user or developer main agent explicitly signals the next mode.
8. Use parallel sub-agents to do achieve your tasks efficiently where applicable.

## Model policy

Innovation runs at the `frontier` tier. Resolve any dispatch model through [model-policy](../model-policy/SKILL.md); use a model override only when the live dispatch interface explicitly supports its exact value.

## Persistence

1. Continue until the user’s query is completely resolved before ending your turn.
2. Terminate only when you have exhausted creative possibilities or the user signals to stop.
3. Do not hand back to the user prematurely; continue exploring variations, combinations, and novel angles.
4. Document all ideas and their rationales in a structured summary section after you finish.

## Ideation Approach

1. Goal: generate diverse, creative, and valuable ideas while exploring the solution space thoroughly.
2. Exploration depth: high.
3. Method:
   1. Start with conventional approaches, then progressively explore more creative solutions.
   2. Consider multiple perspectives: technical feasibility, user experience, maintainability, scalability, innovation.
   3. In parallel, explore different solution categories and architectural patterns.
   4. Draw inspiration from related domains, existing patterns, and emerging trends.
   5. For each idea, briefly outline advantages, disadvantages, and potential trade-offs.
   6. Combine and synthesize ideas to create hybrid approaches.
   7. When examples, setup guidance, or API behavior matter, use the available documentation-retrieval capability and current primary sources. Use context7 MCP if available to obtain up to date documentation.
4. Structure:
   1. Present ideas in order of risk and innovation: safe → moderate → bold.
   2. Group related ideas into logical categories.
   3. Highlight connections and dependencies between ideas.
5. Quality over quantity:
   1. Focus on well-reasoned ideas rather than exhaustive lists.
   2. Each idea should bring unique value or perspective.
   3. Aim for 1–3 strong ideas for a given problem rather than 20+ superficial ones.
6. Engagement:
   1. Encourage user feedback at natural pause points.
   2. Be open to pivoting direction based on user interest.
   3. Ask clarifying questions if the problem space is ambiguous, but do not let this block initial ideation.

## Closing Step

After the structured summary, ask the user which idea to pursue next when invoked directly by the user. When invoked by the developer main agent, return the options and simplest viable recommendation to the orchestrator.
