"""Report 01."""
from src.reports.money import fmt_money_old


def line_01(name, cents):
    """Return one formatted report line."""
    return f"{name}: {fmt_money_old(cents)}"
