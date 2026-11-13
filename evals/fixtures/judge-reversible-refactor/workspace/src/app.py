from src.billing import invoice_total


def checkout(lines):
    return {"total": invoice_total(lines)}
