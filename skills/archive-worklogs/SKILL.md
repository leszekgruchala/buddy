---
name: archive-worklogs
description: Archive, clean up, or organize dated `.ai/worklog` development worklogs by year using an age or date cutoff. Keep the current request in this skill; route new requests by their own scope.
---

# Archive Worklogs

Keep the current request in this skill. Do not activate another Buddy skill without user or `develop` direction. Workers return to their caller. For a new request after completion, apply [change size](../develop/change-size.md) and route by its own scope. Move whole worklogs without deleting contents.

## Model selection

Apply [model selection](../develop/model-selection.md); recommend `balanced`.

## Procedure

1. Run from the repository root with `python3 <skill-dir>/scripts/archive_worklogs.py --older-than <days>`.
2. Review the dry-run with the user unless archival was already explicit.
3. Add `--apply` to move the listed worklogs into `.ai/worklog/archive/<yyyy>/`.
4. For an exact inclusive cutoff, replace `--older-than` with `--through YYYY-MM-DD`.
5. Refuse collisions; skip and report malformed names and symlinks, never following them.

Age uses only the `yyyyMMdd` prefix. `--older-than 7` means strictly before the local date seven days ago. Dry-run is always default.
