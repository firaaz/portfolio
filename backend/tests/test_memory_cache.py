"""Unit tests for MemoryCache — LRU eviction and TTL expiry."""

import time

from app.adapters.cache.memory_cache import MemoryCache
from app.domain.ux import UXGlobals, UXItem, UXState


def _make_state(tag: str) -> UXState:
    """Create a minimal valid UX state for cache testing."""
    return UXState(
        ux=UXGlobals(),
        items=[
            UXItem(
                id=tag,
                salience=0.5,
                group="identity",
                molecule="hero",
                data={
                    "name": "Test",
                    "title": "Dev",
                    "subtitle": "Sub",
                    "summary": tag,
                },
            )
        ],
    )


class TestMemoryCache:
    """MemoryCache stores UX states with LRU eviction and TTL expiry."""

    def test_get_returns_none_for_unknown_key(self) -> None:
        """Unknown keys return None."""
        cache = MemoryCache(capacity=8)
        assert cache.get("nonexistent") is None

    def test_set_and_get_returns_state(self) -> None:
        """Stored UX state is retrievable by key."""
        cache = MemoryCache(capacity=8)
        state = _make_state("a")
        cache.set("linkedin", state, ttl_seconds=60)
        assert cache.get("linkedin") == state

    def test_expired_entry_returns_none(self) -> None:
        """Entries past their TTL are evicted on access."""
        cache = MemoryCache(capacity=8)
        cache.set("old", _make_state("old"), ttl_seconds=0)
        time.sleep(0.01)
        assert cache.get("old") is None

    def test_lru_evicts_oldest_when_full(self) -> None:
        """When capacity is reached, the least-recently-used entry is evicted."""
        cache = MemoryCache(capacity=2)
        cache.set("a", _make_state("a"), ttl_seconds=60)
        cache.set("b", _make_state("b"), ttl_seconds=60)
        cache.set("c", _make_state("c"), ttl_seconds=60)
        assert cache.get("a") is None
        assert cache.get("b") is not None
        assert cache.get("c") is not None

    def test_get_refreshes_lru_order(self) -> None:
        """Accessing an entry moves it to most-recently-used, protecting it."""
        cache = MemoryCache(capacity=2)
        cache.set("a", _make_state("a"), ttl_seconds=60)
        cache.set("b", _make_state("b"), ttl_seconds=60)
        cache.get("a")  # refresh "a", making "b" the oldest
        cache.set("c", _make_state("c"), ttl_seconds=60)
        assert cache.get("a") is not None
        assert cache.get("b") is None

    def test_set_overwrites_existing_key(self) -> None:
        """Setting an existing key replaces its value."""
        cache = MemoryCache(capacity=8)
        cache.set("x", _make_state("v1"), ttl_seconds=60)
        replacement = _make_state("v2")
        cache.set("x", replacement, ttl_seconds=60)
        assert cache.get("x") == replacement

    def test_clear_removes_all_entries(self) -> None:
        """Clear empties the entire cache."""
        cache = MemoryCache(capacity=8)
        cache.set("a", _make_state("a"), ttl_seconds=60)
        cache.set("b", _make_state("b"), ttl_seconds=60)
        cache.clear()
        assert cache.get("a") is None
        assert cache.get("b") is None
