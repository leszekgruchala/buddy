"""Record domain model."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Record:
    """A record owned by one user."""

    id: str
    owner_id: str
