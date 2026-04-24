"""Stream route with SelectStrategy — asserts five-verb event emission."""

import json
from collections.abc import AsyncGenerator, Iterator
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.adapters.api import stream_route
from app.domain.intelligence import BridgeAnnotation, IntelligenceResult, ItemResult
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_stream_cache() -> Iterator[None]:
    """Clear the module-level cache singleton between tests."""
    stream_route._cache_instance = None
    yield
    stream_route._cache_instance = None


async def _zero_gap_dispatch(
    events: list[str],
    min_gap_ms: int = 0,
    max_gap_ms: int = 0,
) -> AsyncGenerator[str]:
    """Zero-gap replacement for staggered_dispatch to keep tests fast."""
    for event in events:
        yield event


def _fake_llm(call_log: list[int], result: IntelligenceResult | None) -> object:
    """Fake LLM port whose evaluate() records calls and returns a scripted result."""

    class _Fake:
        async def evaluate(
            self,
            strategy_name: str,
            system_prompt: str,
            user_prompt: str,
            result_type: type,
            temperature: float,
            max_tokens: int,
        ) -> IntelligenceResult | None:
            call_log.append(1)
            return result

    return _Fake()


def _raising_llm(call_log: list[int]) -> object:
    """Fake LLM port whose evaluate() raises, to test exception suppression."""

    class _Fake:
        async def evaluate(self, **_: Any) -> IntelligenceResult:
            call_log.append(1)
            raise RuntimeError("llm boom")

    return _Fake()


def _parse_sse(text: str) -> list[dict[str, Any]]:
    """Parse an SSE response body into a list of event payload dicts."""
    return [
        json.loads(line[len("data:") :].strip())
        for line in text.strip().split("\n")
        if line.startswith("data:")
    ]


def _event_key(event: dict[str, Any]) -> str:
    """Return AG-UI type or the ux:<verb> custom eventType for assertions."""
    if event["type"] == "CUSTOM":
        return event["custom"]["eventType"]
    return event["type"]


class TestStreamIntelligence:
    """Stream emits five-verb events in recede -> focus -> bridge -> surface order."""

    def test_emits_events_in_correct_order(self) -> None:
        result = IntelligenceResult(
            items=[
                ItemResult(id="hero", importance=0.95, emphasis=["title"]),
                ItemResult(id="contact", importance=0.8, emphasis=["cta"]),
                ItemResult(id="education-be", importance=0.2),
                ItemResult(id="skill-docker", importance=0.15),
            ],
            bridges=[
                BridgeAnnotation(
                    source_id="hero",
                    target_id="contact",
                    text="Available for hire",
                    grounding=["hero.title", "contact.cta"],
                ),
            ],
        )
        calls: list[int] = []
        fake = _fake_llm(calls, result)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.get("/api/agent/stream")

        events = _parse_sse(response.text)
        types = [_event_key(e) for e in events]

        assert types[0] == "STATE_SNAPSHOT"
        # Two recedes (education-be, skill-docker) then two focuses (hero, contact)
        # then one bridge.
        assert types[1:] == [
            "ux:recede",
            "ux:recede",
            "ux:focus",
            "ux:focus",
            "ux:bridge",
        ]

    def test_cache_hit_replays_events(self) -> None:
        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9, emphasis=["title"])],
        )
        calls: list[int] = []
        fake = _fake_llm(calls, result)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            first = client.get("/api/agent/stream")
            second = client.get("/api/agent/stream")

        assert len(calls) == 1  # LLM hit only once; second request cached
        first_events = _parse_sse(first.text)
        second_events = _parse_sse(second.text)
        assert [_event_key(e) for e in first_events] == [
            _event_key(e) for e in second_events
        ]
        assert "ux:focus" in [_event_key(e) for e in second_events]

    def test_validation_failure_suppresses_events(self) -> None:
        # Unknown ID -> validator rejects -> only snapshot emitted.
        bad = IntelligenceResult(
            items=[ItemResult(id="not-in-catalog", importance=0.9)],
        )
        fake = _fake_llm([], bad)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.get("/api/agent/stream")

        events = _parse_sse(response.text)
        assert len(events) == 1
        assert events[0]["type"] == "STATE_SNAPSHOT"

    def test_llm_exception_suppresses_events(self) -> None:
        calls: list[int] = []
        fake = _raising_llm(calls)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.get("/api/agent/stream")

        events = _parse_sse(response.text)
        assert len(calls) == 1
        assert len(events) == 1
        assert events[0]["type"] == "STATE_SNAPSHOT"

    def test_no_focus_event_below_threshold(self) -> None:
        # All items mid-band (0.5) -> neither focus nor recede fires.
        mid = IntelligenceResult(
            items=[
                ItemResult(id="hero", importance=0.5),
                ItemResult(id="contact", importance=0.5),
            ],
        )
        fake = _fake_llm([], mid)

        with (
            patch(
                "app.adapters.api.stream_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.stream_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.get("/api/agent/stream")

        events = _parse_sse(response.text)
        types = [_event_key(e) for e in events]
        assert types == ["STATE_SNAPSHOT"]
