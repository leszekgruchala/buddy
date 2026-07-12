"""Archive dated development worklogs without deleting their contents."""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

WORKLOG_RE = re.compile(r"^(?P<date>\d{8})_(?P<name>[a-z0-9]+(?:-[a-z0-9]+)*)$")


def parse_args() -> argparse.Namespace:
    """Parse the archive cutoff and execution mode."""
    parser = argparse.ArgumentParser(description=__doc__)
    cutoff = parser.add_mutually_exclusive_group(required=True)
    cutoff.add_argument(
        "--older-than",
        type=int,
        metavar="DAYS",
        help="select dates strictly before the local date DAYS ago",
    )
    cutoff.add_argument(
        "--through",
        type=date.fromisoformat,
        metavar="YYYY-MM-DD",
        help="select dates on or before this date",
    )
    parser.add_argument("--apply", action="store_true", help="move selected worklogs")
    return parser.parse_args()


def resolve_cutoff(args: argparse.Namespace) -> tuple[date, bool]:
    """Return the cutoff date and whether it is inclusive."""
    if args.older_than is not None:
        if args.older_than < 0:
            raise ValueError("--older-than must be zero or greater")
        return date.today() - timedelta(days=args.older_than), False
    return args.through, True


def archive_worklogs(root: Path, cutoff: date, inclusive: bool, apply: bool) -> int:
    """List or move eligible worklogs and return an exit status."""
    worklog_root = root / ".ai" / "worklog"
    archive_root = worklog_root / "archive"
    if not worklog_root.is_dir():
        print(f"Worklog directory does not exist: {worklog_root}", file=sys.stderr)
        return 1

    selected: list[tuple[Path, Path]] = []
    skipped = 0
    errors = 0
    for source in sorted(worklog_root.iterdir()):
        if source.name == "archive":
            continue
        match = WORKLOG_RE.fullmatch(source.name)
        if source.is_symlink() or not source.is_dir() or match is None:
            print(f"SKIP {source.relative_to(root)}: invalid worklog directory")
            skipped += 1
            continue
        try:
            worklog_date = datetime.strptime(match.group("date"), "%Y%m%d").date()
        except ValueError:
            print(f"SKIP {source.relative_to(root)}: invalid date")
            skipped += 1
            continue
        eligible = worklog_date <= cutoff if inclusive else worklog_date < cutoff
        if not eligible:
            continue
        destination = archive_root / str(worklog_date.year) / source.name
        if destination.exists():
            print(f"ERROR {destination.relative_to(root)}: destination exists", file=sys.stderr)
            errors += 1
            continue
        selected.append((source, destination))

    action = "MOVE" if apply else "WOULD MOVE"
    for source, destination in selected:
        print(f"{action} {source.relative_to(root)} -> {destination.relative_to(root)}")
        if apply:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(destination))

    print(f"selected={len(selected)} skipped={skipped} errors={errors} applied={apply}")
    return 1 if errors else 0


def main() -> int:
    """Run the worklog archiver from the current repository root."""
    args = parse_args()
    try:
        cutoff, inclusive = resolve_cutoff(args)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2
    return archive_worklogs(Path.cwd().resolve(), cutoff, inclusive, args.apply)


if __name__ == "__main__":
    sys.exit(main())
