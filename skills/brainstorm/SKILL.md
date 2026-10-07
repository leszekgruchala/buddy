---
name: brainstorm
description: Discuss and pressure-test an idea's purpose, value, scope, and directions. Save useful substance after answers or on request. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Brainstorm

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill.

Explore business, product, personal, or other ideas: their value, intended outcome, scope, and plausible high-level direction. Challenge weak assumptions with reasons and alternatives. Do not produce technical designs, backlogs, or implementation.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

For a reasoning worker, pass this skill, relevant conversation, existing idea document, and latest user message. Request interpretation, tensions, notes, and zero to three useful questions. The host owns communication and document writes; the worker never asks, writes, or spawns. Reuse it when supported; otherwise relay the same context. Delegation or unavailable execution does not trigger documentation. Keep pending answers in permitted existing notes or chat.

## Start or resume

Use the named document, otherwise a clearly matching document in this project's `docs/brainstorming/`. Ask if several match; never choose by recency or merge separate ideas. Read available context before asking; briefly reflect the idea, intended outcome, and main uncertainty. Revisit stale assumptions without asking the user to repeat supplied information.

For a new idea, start in chat without creating a file or directory. Ask useful questions and wait for answers before applying the documentation gate; an explicit save request bypasses the wait. Some sessions remain entirely in chat.

## Discussion loop

1. Interpret answers in context. Retain meaningful constraints, examples, decisions, and corrections; distinguish user statements from inference. Update an existing document after material changes. Explain conflicts with earlier decisions and ask only when they change direction; never silently settle them.
2. Assess beneficiaries, problems or opportunities, value, alternatives, success, scope, constraints, incentives, feasibility, and relevant failure cases as useful lenses, not a questionnaire. Pressure-test plausible assumptions without making every possibility a blocker. Explore distinct approaches only when useful; recommendations remain advice until agreed. Consider simpler alternatives, small validation experiments, or reasons to reconsider.
3. Ask one to three short, numbered questions per round, normally one or two, whose answers would most change the goal, value, boundaries, or next step. Use concrete alternatives or examples when helpful. Wait for answers; never invent them or run multiple rounds at once. Drop questions that repeat settled points, fill a template, pursue unlikely details, or demand premature precision. Defer useful uncertainties explicitly. If no useful question remains, summarize the direction and suggest pausing.
4. Conversational validation checks meaning, consistency, and plausibility; it does not prove demand, costs, market facts, or feasibility. Mark unsupported claims and identify evidence needed. Research facts only when needed and authorized, record source links, and do not automatically start another workflow.

## Living idea document

Create a document only on request or when answers have produced useful substance: a coherent purpose with meaningful constraints, decisions, trade-offs, or a promising direction. An initial pitch, unanswered questions, or brief speculation alone is insufficient. Use judgment, never a fixed turn count or questions manufactured to meet the gate. A chat-only request takes precedence.

Save to the explicitly requested location or `docs/brainstorming/<YYYY-MM-DD>-<idea-slug>.md`. Use the creation date and a short descriptive slug; check collisions and never overwrite unrelated work. Keep the creation date and one document across sessions. Include useful earlier conversation; create no worklog or file per round. Briefly tell the user what was saved.

Write for a future reader without the chat. Include a title, last-updated date, and status such as `Exploring` or `Paused — clear enough for now`. Adapt or omit these starting sections as relevant:

1. **Idea and purpose** — concept, beneficiaries, problem, desired outcome.
2. **Current direction** — approach, value, success signals, scope, constraints.
3. **Decisions and rationale** — agreed choices and material rejected alternatives with reasons.
4. **Assumptions and evidence** — separate user statements, assumptions, agent suggestions, and sourced facts.
5. **Risks and edge cases** — meaningful failures, trade-offs, proposed responses, and unresolved parts.
6. **Open questions** — unanswered and deferred uncertainties; integrate answered questions into relevant sections.
7. **Possible next steps** — small tests or advances, separate from user commitments.

Preserve substantive details and reasons, not a transcript. Maintain the document after meaningful answers and before pausing or changing topics with unsaved substantive changes; skip empty acknowledgments. When direction changes, update the current account and retain a short account of material superseded decisions and why. Never convert suggestions into agreements or unanswered questions into answers.

If saving fails or is prohibited, disclose it and give the unsaved update in chat; never claim persistence.

## Pause and finish

Stop asking immediately when the user pauses, stops, or says the idea is fine for now. Pausing alone does not create a document. Reconcile and save an existing document when permitted, including uncertainties and agreed next steps; mark it paused without implying complete resolution or validation. Return its link and a brief direction and uncertainty. Without a document, give a short chat recap; creation still requires the documentation gate or a save request.

Resume from the conversation, document, and new information. A clear idea does not authorize specification, implementation, or external action; wait for an explicit next request.
