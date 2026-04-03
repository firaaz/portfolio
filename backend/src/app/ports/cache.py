"""Cache port — protocol for manifest caching."""

from typing import Protocol

from app.domain.manifest import Manifest


class CachePort(Protocol):
    """Port for caching assembled manifests by key."""

    def get(self, key: str) -> Manifest | None:
        """Return cached manifest or None if missing/expired."""
        ...

    def set(self, key: str, value: Manifest, ttl_seconds: int) -> None:
        """Store a manifest under the given key with a TTL."""
        ...

    def clear(self) -> None:
        """Remove all cached entries."""
        ...
