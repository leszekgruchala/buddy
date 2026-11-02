"""Report 06."""
from src.reports.money import fmt_money_old


def line_06(name, cents):
    """Return one formatted report line."""
    return f"{name}: {fmt_money_old(cents)}"
