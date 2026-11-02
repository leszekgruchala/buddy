"""Reserve stock by SKU."""


def reserve(stock, sku, qty):
    """Reduce available stock for sku by qty and return the remainder."""
    stock[sku] = stock.get(sku, 0) - qty
    return stock[sku]
