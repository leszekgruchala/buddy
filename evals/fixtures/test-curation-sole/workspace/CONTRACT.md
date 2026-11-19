# Quantities

`parse_quantity(text)` returns the whole number in `text`, ignoring surrounding spaces. It accepts 1 to 999, both included. It raises `ValueError` when `text` is blank, is not a whole number, or is outside that range.

Use `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -t . -v` from this workspace.

Change only files under `tests` and `.ai/worklog`. Do not install dependencies, change this contract or `src`, add infrastructure, or access external services.
