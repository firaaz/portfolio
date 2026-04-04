"""In-memory LRU cache with TTL — thread-safe via threading.Lock."""

import threading
import time
from collections import OrderedDict

from app.domain.ux import UXState

_CacheEntry = tuple[UXState, float]  # (value, expires_at)


class MemoryCache:
    """LRU cache backed by OrderedDict with per-entry TTL."""

    def __init__(self, capacity: int = 32) -> None:
        """Create a cache with the given max capacity."""
        self._capacity = capacity
        self._store: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> UXState | None:
        """Return cached UX state if present and not expired, else None."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() >= expires_at:
                del self._store[key]
                return None
            self._store.move_to_end(key)
            return value

    def set(self, key: str, value: UXState, ttl_seconds: int) -> None:
        """Store UX state with TTL, evicting LRU entry if at capacity."""
        expires_at = time.monotonic() + ttl_seconds
        with self._lock:
            if key in self._store:
                del self._store[key]
            elif len(self._store) >= self._capacity:
                self._store.popitem(last=False)
            self._store[key] = (value, expires_at)

    def clear(self) -> None:
        """Remove all cached entries."""
        with self._lock:
            self._store.clear()
