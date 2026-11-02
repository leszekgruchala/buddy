# Shop maintenance

Three independent tasks. Each area owns its files; no task depends on another.

1. `src/pricing/discount.py`: `apply_discount(cents, percent)` returns the price in whole cents rounded half up. It currently truncates. `percent` outside 0-100 raises `ValueError`.
2. `src/inventory/reserve.py`: `reserve(stock, sku, qty)` must reject a reservation larger than the available quantity with `ValueError` and leave `stock` unchanged. It currently allows negative stock.
3. `src/reports/`: replace every call to the deprecated `fmt_money_old(cents)` with `fmt_money(cents)` from `src/reports/money.py`. Behavior must not change. Do not edit `money.py`.

Use `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v` from this workspace. Change only files under `src/` and `tests/`, except `src/reports/money.py`. Do not install dependencies or access external services.
