"""Report 13."""
from src.reports.money import fmt_money_old


def line_13(name, cents):
    """Return one formatted report line."""
    return f"{name}: {fmt_money_old(cents)}"
