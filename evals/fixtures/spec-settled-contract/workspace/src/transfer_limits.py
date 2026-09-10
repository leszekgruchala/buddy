DEFAULT_DAILY_TRANSFER_LIMIT = 100


def effective_daily_transfer_limit(requested_limit: int | None) -> int:
    """Return the supplied limit or the current default daily limit."""
    return DEFAULT_DAILY_TRANSFER_LIMIT if requested_limit is None else requested_limit
