"""Apply percentage discounts."""


def _round_money(amount):
    return round(amount, 2)


def apply_discount(price, percent):
    """Return price reduced by percent, rounded to cents; raise ValueError when an input is invalid."""
    if price < 0:
        raise ValueError("Price must not be negative")
    if not 0 <= percent <= 100:
        raise ValueError("Percent must be between 0 and 100")
    return _round_money(price * (100 - percent) / 100)
