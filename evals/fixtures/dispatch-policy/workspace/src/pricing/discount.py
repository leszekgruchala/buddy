"""Apply percentage discounts to prices in cents."""


def apply_discount(cents, percent):
    """Return cents after a percent discount."""
    return int(cents * (100 - percent) / 100)
