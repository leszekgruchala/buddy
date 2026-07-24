---
name: archive-worklogs
description: Archive dated development worklogs from .ai/worklog into its year-grouped archive. Use when the user asks to archive, clean up, organize, or move worklogs older than a date or number of days.
---

# Archive Worklogs

Do not activate another Buddy skill. Archive whole worklog directories without deleting their research, spec, plan, or trash contents.

1. Run from the repository root with `python3 <skill-dir>/scripts/archive_worklogs.py --older-than <days>`.
2. Review the dry-run output with the user before changing files unless the user already explicitly requested archival.
3. Add `--apply` to move the listed worklogs into `.ai/worklog/archive/<yyyy>/`.
4. Use `--through YYYY-MM-DD` instead of `--older-than` when the user gives an exact inclusive cutoff date.
5. Refuse destination collisions. Report malformed names and symlinks as skipped; never follow them.

The script derives age only from the `yyyyMMdd` directory prefix. `--older-than 7` selects worklogs dated strictly before the local date seven days ago. Dry-run is always the default.
