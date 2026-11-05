"""Normalize short text codes."""


def normalize_code(value, *, max_length=12):
    """Return value trimmed and in upper case; raise ValueError when it is invalid."""
    if not isinstance(value, str):
        raise ValueError("Code must be a string")
    code = value.strip().upper()
    if not code:
        raise ValueError("Code must not be blank")
    if len(code) > max_length:
        raise ValueError("Code is too long")
    return code
