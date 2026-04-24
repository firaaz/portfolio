"""Command route with ComposeStrategy — asserts five-verb event emission."""

import json
from collections.abc import AsyncGenerator
from typing import Any
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.domain.intelligence import BridgeAnnotation, IntelligenceResult, ItemResult
from app.main import app

client = TestClient(app)


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
        async def evaluate(self, **_: Any) -> IntelligenceResult | None:
            call_log.append(1)
            return result

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


class TestCommandIntelligence:
    """Command emits five-verb events with ux:surface for generated content."""

    def test_emits_surface_events_for_generated_content(self) -> None:
        result = IntelligenceResult(
            items=[
                ItemResult(
                    id="hero",
                    importance=0.95,
                    emphasis=["title"],
                    generated={"title": "Distributed systems engineer"},
                ),
                ItemResult(
                    id="project-salama",
                    importance=0.8,
                    generated={"summary": "Event-driven microservices at scale"},
                ),
                ItemResult(id="education-be", importance=0.2),
            ],
            bridges=[
                BridgeAnnotation(
                    source_id="hero",
                    target_id="project-salama",
                    text="Applied distributed patterns in production",
                    grounding=["hero.title", "project-salama.summary"],
                ),
            ],
        )
        calls: list[int] = []
        fake = _fake_llm(calls, result)

        with (
            patch(
                "app.adapters.api.command_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.command_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.post(
                "/api/agent/command",
                json={"text": "what distributed systems have you worked on?"},
            )

        events = _parse_sse(response.text)
        types = [_event_key(e) for e in events]

        assert types[0] == "STATE_SNAPSHOT"
        assert types[1] == "ux:signal"
        # Order after signal: 1 recede, 2 focuses, 1 bridge, then 2 surfaces at the end.
        assert types[2:] == [
            "ux:recede",
            "ux:focus",
            "ux:focus",
            "ux:bridge",
            "ux:surface",
            "ux:surface",
        ]

    def test_no_cache_llm_called_every_request(self) -> None:
        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9, emphasis=["title"])],
        )
        calls: list[int] = []
        fake = _fake_llm(calls, result)

        with (
            patch(
                "app.adapters.api.command_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.command_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            client.post("/api/agent/command", json={"text": "show projects"})
            client.post("/api/agent/command", json={"text": "show projects"})

        assert len(calls) == 2  # No caching — both requests call LLM.

    def test_validation_failure_suppresses_events(self) -> None:
        bad = IntelligenceResult(
            items=[ItemResult(id="not-in-catalog", importance=0.9)],
        )
        fake = _fake_llm([], bad)

        with (
            patch(
                "app.adapters.api.command_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.command_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.post(
                "/api/agent/command",
                json={"text": "anything"},
            )

        events = _parse_sse(response.text)
        # Signal fires unconditionally; cascade is suppressed on validation failure.
        assert len(events) == 2
        assert events[0]["type"] == "STATE_SNAPSHOT"
        assert _event_key(events[1]) == "ux:signal"
        # No five-verb cascade events — validation failure suppresses them.

    def test_signal_fires_second_after_snapshot(self) -> None:
        """Signal is the 2nd event in commands, between snapshot and cascade."""
        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9, emphasis=["title"])],
        )
        fake = _fake_llm([], result)

        with (
            patch(
                "app.adapters.api.command_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.command_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.post(
                "/api/agent/command",
                json={"text": "show projects"},
                headers={"Referer": "https://github.com/example"},
            )

        events = _parse_sse(response.text)
        types = [_event_key(e) for e in events]
        assert len(types) >= 2
        assert types[0] == "STATE_SNAPSHOT"
        assert types[1] == "ux:signal"

    def test_surface_event_carries_generated_payload(self) -> None:
        result = IntelligenceResult(
            items=[
                ItemResult(
                    id="hero",
                    importance=0.9,
                    emphasis=["title"],
                    generated={"title": "Query-tuned title"},
                ),
            ],
        )
        fake = _fake_llm([], result)

        with (
            patch(
                "app.adapters.api.command_route._get_llm_port",
                return_value=fake,
            ),
            patch(
                "app.adapters.api.command_route.staggered_dispatch",
                _zero_gap_dispatch,
            ),
        ):
            response = client.post(
                "/api/agent/command",
                json={"text": "tell me about yourself"},
            )

        events = _parse_sse(response.text)
        surfaces = [e for e in events if _event_key(e) == "ux:surface"]
        assert len(surfaces) == 1
        assert surfaces[0]["custom"]["item_id"] == "hero"
        assert surfaces[0]["custom"]["generated"] == {"title": "Query-tuned title"}
