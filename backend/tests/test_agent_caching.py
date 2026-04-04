"""BDD tests for cache integration in the SSE stream route."""

import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.adapters.cache.memory_cache import MemoryCache
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.ux import UXGlobals, UXItem, UXState
from app.main import app

client = TestClient(app)


def _fake_llm_port(ux_state: UXState) -> object:
    """Create a fake LLM port that records calls and returns a UX state."""

    class _Fake:
        call_count: int = 0

        async def assemble_ux_state(
            self,
            context: VisitorContext,
            catalog: list[ContentItem],
        ) -> UXState:
            _Fake.call_count += 1
            return ux_state

    _Fake.call_count = 0
    return _Fake()


def _get_default_state() -> UXState:
    """Fetch the default UX state from a no-LLM stream response."""
    with patch(
        "app.adapters.api.stream_route._get_llm_port",
        return_value=None,
    ):
        resp = client.get("/api/agent/stream")
    event = json.loads(resp.text.strip().split("\n")[0][len("data:") :])
    return UXState(**event["snapshot"])


def _make_refined(base: UXState) -> UXState:
    """Tweak salience scores so the UX state differs from default."""
    return UXState(
        ux=UXGlobals(),
        items=[
            UXItem(
                id=i.id,
                salience=min(i.salience + 0.1, 1.0),
                group=i.group,
                molecule=i.molecule,
                data=i.data,
            )
            for i in base.items
        ],
    )


class TestAgentCaching:
    """Cache integration: LLM results cached by referrer_type."""

    def test_given_cached_state_when_same_referrer_then_llm_skipped(
        self,
    ) -> None:
        """Cache hit returns cached UX state without calling LLM."""
        default = _get_default_state()
        refined = _make_refined(default)
        fake = _fake_llm_port(refined)
        cache = MemoryCache(capacity=8)
        cache.set("linkedin", refined, ttl_seconds=60)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
        ):
            resp = client.get(
                "/api/agent/stream",
                headers={"referer": "https://www.linkedin.com/in/x"},
            )

        assert fake.__class__.call_count == 0
        events = _parse_events(resp.text)
        assert len(events) == 2
        assert events[1]["type"] == "CUSTOM"
        assert events[1]["custom"]["eventType"] == "ux:salience"

    def test_given_empty_cache_when_request_then_llm_called_and_cached(
        self,
    ) -> None:
        """Cache miss triggers LLM call and stores result."""
        default = _get_default_state()
        refined = _make_refined(default)
        fake = _fake_llm_port(refined)
        cache = MemoryCache(capacity=8)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://github.com/user"},
            )

        assert fake.__class__.call_count == 1
        assert cache.get("github") == refined

    def test_given_two_requests_same_type_then_llm_called_once(
        self,
    ) -> None:
        """Second request for same referrer_type uses cache."""
        default = _get_default_state()
        refined = _make_refined(default)
        fake = _fake_llm_port(refined)
        cache = MemoryCache(capacity=8)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
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
        default = _get_default_state()
        refined = _make_refined(default)
        fake = _fake_llm_port(refined)
        cache = MemoryCache(capacity=8)
        cache.set("linkedin", refined, ttl_seconds=60)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route._get_cache",
                return_value=cache,
            ),
        ):
            client.get(
                "/api/agent/stream",
                headers={"referer": "https://github.com/user"},
            )

        assert fake.__class__.call_count == 1


def _parse_events(text: str) -> list[dict]:
    """Parse SSE text into a list of event payloads."""
    return [
        json.loads(line[len("data:") :].strip())
        for line in text.strip().split("\n")
        if line.startswith("data:")
    ]
