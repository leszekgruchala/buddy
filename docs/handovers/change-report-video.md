# Handover: Change-report demo video

**Date:** 2026-10-02
**Previous Context Usage:** Not available from the runtime.

## Goals & Scope

Create a short video that shows the change report and its value for a LinkedIn audience. The user approved the skill and requested its integration into main before release. Video production has not started; posting and release publication need a separate request.

## Key Decisions & Changes

1. The report explains what changed, who is affected, practical consequences, and relevant actions. Architecture is optional. Fixes, UX, documentation, tests, and maintenance must remain covered.
2. The fixed offline HTML template includes Before/After/Impact comparisons, early warnings, inline High risk / Breaking change / Human review markers, and collapsed evidence. Mobile fields stack with visible labels.
3. Optional architecture has Execution flow and selectable Before/After diagrams. Changed connections precede unchanged context. The inspector shows responsibilities, connections, and evidence. The redundant component Summary tab was removed.
4. Empty per-change evidence adds a visible warning. Five regression tests and five evaluation cases were added; paired model evaluations have not run. Astra reviewed the final design at medium effort and found no actionable defects.

## Important References

1. `docs/examples/change-report.html`: the copied, self-contained sample report. Open it in a browser. This is a frozen development example; its recorded source snapshot is not a comparison of the latest main revision.
2. `skills/change-report/SKILL.md`: report workflow and brevity rules.
3. `skills/change-report/assets/report.html`, `scripts/render_report.py`, and `references/report-data.md`: fixed template, renderer, and input contract, relative to the skill directory.
4. `skills/change-report/references/examples.md`: outcome wording examples; `tests/test_change_report.py`: regression checks.
5. `evals/cases/change-report/evals.json` and `grading.md`: five paired evaluation cases and human grading guidance.

## Open Tasks

- [ ] Produce a roughly 35-second silent demo with short English subtitles: changes and impact, risks and actions, execution flow, then evidence.
- [ ] Record real report interactions with readable close-ups, controlled scrolling, tab changes, and component selection. Exclude browser chrome and personal paths; keep subtitles below report content.
- [ ] Export a 1080×1350 MP4 with burned-in subtitles and a separate SRT file. Browser recording, FFmpeg, and ffprobe are available locally. Review readability, timing, and final playback before delivery.
- [ ] Run the defined paired model evaluations when requested. No general evaluation runner is provided in this checkout.

## Context Mode Status

- The tool reported 96.0% of indexed output kept out of the conversation context.
- Compaction performed: yes. Session knowledge remains in Context Mode; it is not guaranteed to transfer to a new chat.

## How to Continue

Copy this handover into a new chat. Inspect main and repository instructions first, then open the sample report at `docs/examples/change-report.html`. Preserve the report and skill behavior while producing the video. Keep the focus on practical outcomes, not architecture alone.

If Context Mode is available, start with `ctx stats` and use its processing tools for large outputs. Read the available Context Mode instructions; no separate context-persistence skill was verified. Validate package changes with the repository's documented validator and change-report regression tests. Do not install or refresh the plugin, push, publish a release, or post to LinkedIn without a request.
