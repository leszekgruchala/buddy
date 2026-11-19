# Discounts

`apply_discount(price, percent)` returns `price` reduced by `percent` percent, rounded to cents. It raises `ValueError` when `price` is negative or `percent` is outside 0 to 100.

Use `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -t . -v` from this workspace.

Change only files under `tests` and `.ai/worklog`. Do not install dependencies, change this contract or `src`, add infrastructure, or access external services.
