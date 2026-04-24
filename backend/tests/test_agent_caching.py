"""BDD tests for cache integration in the SSE stream route."""

from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.adapters.cache.memory_cache import MemoryCache
from app.domain.intelligence import IntelligenceResult, ItemResult
from app.main import app

client = TestClient(app)


def _fake_llm_port(result: IntelligenceResult) -> object:
    """Create a fake LLM port that records calls and returns an IntelligenceResult."""

    class _Fake:
        call_count: int = 0

        async def evaluate(self, **_: Any) -> IntelligenceResult:
            _Fake.call_count += 1
            return result

    _Fake.call_count = 0
    return _Fake()


async def _zero_gap_dispatch(
    events: list[str],
    min_gap_ms: int = 0,
    max_gap_ms: int = 0,
) -> AsyncGenerator[str]:
    """Zero-gap replacement for staggered_dispatch to keep tests fast."""
    for event in events:
        yield event


def _sample_result() -> IntelligenceResult:
    """A valid IntelligenceResult referencing known catalog IDs."""
    return IntelligenceResult(
        items=[
            ItemResult(id="hero", importance=0.9, emphasis=["title"]),
            ItemResult(id="contact", importance=0.8, emphasis=["cta"]),
        ],
    )


class TestAgentCaching:
    """Cache integration: IntelligenceResult cached by referrer_type."""

    def test_given_cached_state_when_same_referrer_then_llm_skipped(
        self,
    ) -> None:
        """Cache hit returns cached result without calling LLM."""
        result = _sample_result()
        fake = _fake_llm_port(result)
        cache: MemoryCache[IntelligenceResult] = MemoryCache(capacity=8)
        cache.set("linkedin", result, ttl_seconds=60)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://www.linkedin.com/in/x"},
            )

        assert fake.__class__.call_count == 0

    def test_given_empty_cache_when_request_then_llm_called_and_cached(
        self,
    ) -> None:
        """Cache miss triggers LLM call and stores result."""
        result = _sample_result()
        fake = _fake_llm_port(result)
        cache: MemoryCache[IntelligenceResult] = MemoryCache(capacity=8)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://github.com/user"},
            )

        assert fake.__class__.call_count == 1
        assert cache.get("github") == result

    def test_given_two_requests_same_type_then_llm_called_once(
        self,
    ) -> None:
        """Second request for same referrer_type uses cache."""
        result = _sample_result()
        fake = _fake_llm_port(result)
        cache: MemoryCache[IntelligenceResult] = MemoryCache(capacity=8)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://www.linkedin.com/in/a"},
            )
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://www.linkedin.com/in/b"},
            )

        assert fake.__class__.call_count == 1

    def test_given_cached_type_when_different_type_then_llm_called(
        self,
    ) -> None:
        """Different referrer_type is a cache miss even if others cached."""
        result = _sample_result()
        fake = _fake_llm_port(result)
        cache: MemoryCache[IntelligenceResult] = MemoryCache(capacity=8)
        cache.set("linkedin", result, ttl_seconds=60)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://github.com/user"},
            )

        assert fake.__class__.call_count == 1
