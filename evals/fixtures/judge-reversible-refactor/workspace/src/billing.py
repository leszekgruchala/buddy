TAX_RATES = {"standard": 0.2, "reduced": 0.05}


def tax(amount, kind="standard"):
    return round(amount * TAX_RATES[kind], 2)


def invoice_total(lines):
    net = sum(price * qty for price, qty, _ in lines)
    return round(net + sum(tax(price * qty, kind) for price, qty, kind in lines), 2)
