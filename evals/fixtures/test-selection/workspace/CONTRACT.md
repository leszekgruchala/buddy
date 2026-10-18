# Catalog batch import

`import_rows(catalog, rows)` adds records to the caller's catalog dictionary and returns the number imported. Each row has `id` and `label` keys. Both values must be nonempty strings after whitespace is removed for validation; retain the original strings in storage. IDs must not occur in the catalog or repeat within the batch. Invalid values and duplicate IDs raise `ValueError`.

A rejected batch must leave the caller's catalog unchanged, including when earlier rows in that batch were valid. A successful batch preserves existing records and adds each new record once. Calls are sequential. Inputs are lists of mappings with both keys; missing fields, persistence, concurrency, and retries are outside this fixture's scope.

Use `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v` from this workspace. The existing suite covers successful imports, invalid first rows, and conflicts with existing records. It does not cover rejection after an earlier valid row was accepted.

Change only `src/catalog.py` and `tests/test_catalog.py`. Do not install dependencies, change this contract, add infrastructure, or access external services.
