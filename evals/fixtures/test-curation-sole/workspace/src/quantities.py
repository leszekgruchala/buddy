"""Parse order quantities."""

MAX_QUANTITY = 999


def parse_quantity(text):
    """Return the quantity in text; raise ValueError when it is blank, not whole, or out of range."""
    stripped = text.strip()
    if not stripped:
        raise ValueError("Quantity must not be blank")
    quantity = int(stripped)
    if quantity < 1 or quantity > MAX_QUANTITY:
        raise ValueError("Quantity must be between 1 and 999")
    return quantity
