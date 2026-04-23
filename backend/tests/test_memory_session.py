"""Tests for in-memory session store."""

import time

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


class TestInMemorySession:
    def test_get_missing_returns_none(self) -> None:
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        assert store.get("nonexistent") is None

    def test_upsert_and_get(self) -> None:
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        result = store.get("s1")
        assert result is not None
        assert result.session_id == "s1"

    def test_expired_entry_returns_none(self) -> None:
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=0)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        time.sleep(0.01)
        assert store.get("s1") is None

    def test_delete(self) -> None:
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60)
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        store.upsert(profile)
        store.delete("s1")
        assert store.get("s1") is None

    def test_capacity_evicts_oldest(self) -> None:
        from app.adapters.session.memory_session import InMemorySession

        store = InMemorySession(ttl_seconds=60, capacity=2)
        for i in range(3):
            store.upsert(VisitorProfile(session_id=f"s{i}", context=VisitorContext()))
        assert store.get("s0") is None
        assert store.get("s2") is not None
