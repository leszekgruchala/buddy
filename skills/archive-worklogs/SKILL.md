---
name: archive-worklogs
description: Archive dated `.ai/worklog` development worklogs by year. Use to archive, clean up, organize, or move worklogs older than a date or number of days. Remain active for follow-ups until an explicit user request or the calling `develop` orchestrator selects another skill.
---

# Archive Worklogs

Remain in this skill for follow-ups. Do not activate another Buddy skill or act outside this skill; only an explicit user request or the calling `develop` orchestrator can select the next skill. Move whole worklogs; delete none of their research, spec, plan, or trash contents.

1. Run from the repository root with `python3 <skill-dir>/scripts/archive_worklogs.py --older-than <days>`.
2. Review the dry-run with the user unless archival was already explicit.
3. Add `--apply` to move the listed worklogs into `.ai/worklog/archive/<yyyy>/`.
4. For an exact inclusive cutoff, replace `--older-than` with `--through YYYY-MM-DD`.
5. Refuse collisions; skip and report malformed names or symlinks, never following them.

Age uses only the `yyyyMMdd` prefix. `--older-than 7` means strictly before the local date seven days ago. Dry-run is always default.
