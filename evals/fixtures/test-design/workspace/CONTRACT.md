# Code normalization

`src/core` is a generic module. It knows nothing about its consumers. `src/billing` depends on `src/core`.

`normalize_code(value, *, max_length=12)` returns the value trimmed and in upper case. It raises `ValueError` when the value is not a string, is blank, or is longer than `max_length` after normalization.

`invoice_code(value)` returns a normalized code of at most 10 characters that starts with `INV-`, and raises `ValueError` otherwise.

Use `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -t . -v` from this workspace.

Change only files under `src` and `tests`. Do not install dependencies, change this contract, add infrastructure, or access external services.
