"""In-memory session store with TTL — same LRU pattern as MemoryCache."""

import threading
import time
from collections import OrderedDict

from app.domain.session import VisitorProfile

_Entry = tuple[VisitorProfile, float]  # (profile, expires_at)


class InMemorySession:
    """LRU session store with per-entry TTL."""

    def __init__(self, ttl_seconds: int = 1800, capacity: int = 256) -> None:
        self._ttl = ttl_seconds
        self._capacity = capacity
        self._store: OrderedDict[str, _Entry] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, session_id: str) -> VisitorProfile | None:
        """Return a profile if it exists and hasn't expired, else None."""
        with self._lock:
            entry = self._store.get(session_id)
            if entry is None:
                return None
            profile, expires_at = entry
            if time.monotonic() >= expires_at:
                del self._store[session_id]
                return None
            self._store.move_to_end(session_id)
            return profile

    def upsert(self, profile: VisitorProfile) -> None:
        """Insert or replace a profile, evicting the oldest entry if at capacity."""
        expires_at = time.monotonic() + self._ttl
        with self._lock:
            if profile.session_id in self._store:
                del self._store[profile.session_id]
            elif len(self._store) >= self._capacity:
                self._store.popitem(last=False)
            self._store[profile.session_id] = (profile, expires_at)

    def delete(self, session_id: str) -> None:
        """Remove a profile by session ID."""
        with self._lock:
            self._store.pop(session_id, None)
