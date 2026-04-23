"""Session port — protocol for visitor session storage."""

from typing import Protocol

from app.domain.session import VisitorProfile


class SessionPort(Protocol):
    """Port for storing and retrieving visitor profiles."""

    def get(self, session_id: str) -> VisitorProfile | None: ...

    def upsert(self, profile: VisitorProfile) -> None: ...

    def delete(self, session_id: str) -> None: ...
