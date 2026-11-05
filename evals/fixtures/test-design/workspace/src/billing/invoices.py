"""Build invoice codes."""

from src.core.codes import normalize_code


def invoice_code(value):
    """Return a normalized invoice code; raise ValueError when it is invalid."""
    code = normalize_code(value, max_length=10)
    if not code.startswith("INV-"):
        raise ValueError("Invoice code needs the INV- prefix")
    return code
