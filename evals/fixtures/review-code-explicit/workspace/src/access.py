"""Authorization helpers for record deletion."""

from .models import Record


def can_delete_record(user_id: str, record: Record) -> bool:
    """Return whether the current user may delete the owner's record."""
    return bool(user_id and user_id == record.id)
