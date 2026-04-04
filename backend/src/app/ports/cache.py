"""Cache port — protocol for UX state caching."""

from typing import Protocol

from app.domain.ux import UXState


class CachePort(Protocol):
    """Port for caching assembled UX states by key."""

    def get(self, key: str) -> UXState | None:
        """Return cached UX state or None if missing/expired."""
        ...

    def set(self, key: str, value: UXState, ttl_seconds: int) -> None:
        """Store a UX state under the given key with a TTL."""
        ...

    def clear(self) -> None:
        """Remove all cached entries."""
        ...
