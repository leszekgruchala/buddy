"""Money formatting."""


def fmt_money(cents):
    """Format cents as a dollar string."""
    return f"${cents // 100}.{cents % 100:02d}"


def fmt_money_old(cents):
    """Deprecated: use fmt_money."""
    return fmt_money(cents)
