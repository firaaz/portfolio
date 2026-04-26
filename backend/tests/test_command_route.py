"""Command route endpoint contract tests."""

import json

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _parse_sse_events(text: str) -> list[dict]:
    """Parse SSE text into a list of JSON payloads."""
    events = []
    for line in text.strip().split("\n"):
        if line.startswith("data:"):
            data = line[len("data:") :].strip()
            events.append(json.loads(data))
    return events


class TestCommandEndpoint:
    """POST /api/agent/command returns AG-UI SSE events."""

    def test_returns_event_stream_content_type(self) -> None:
        response = client.post(
            "/api/agent/command",
            json={"text": "show contact", "session_id": "test-session"},
        )
        assert response.headers["content-type"].startswith("text/event-stream")

    def test_contains_state_snapshot(self) -> None:
        response = client.post(
            "/api/agent/command",
            json={"text": "show contact", "session_id": "test-session"},
        )
        events = _parse_sse_events(response.text)
        types = [e["type"] for e in events]
        assert "STATE_SNAPSHOT" in types

    def test_snapshot_has_valid_ux_state(self) -> None:
        response = client.post(
            "/api/agent/command",
            json={"text": "show contact", "session_id": "test-session"},
        )
        events = _parse_sse_events(response.text)
        snapshot = next(e for e in events if e["type"] == "STATE_SNAPSHOT")
        assert "ux" in snapshot["snapshot"]
        items = snapshot["snapshot"]["items"]
        assert len(items) == 13
        for item in items:
            assert 0.0 <= item["salience"] <= 1.0
            assert item["id"]
            assert item["molecule"]

    def test_rejects_missing_text(self) -> None:
        response = client.post("/api/agent/command", json={})
        assert response.status_code == 422

    def test_rejects_empty_text(self) -> None:
        response = client.post("/api/agent/command", json={"text": ""})
        assert response.status_code == 422


class TestCommandRoutePersonaAndVoice:
    """Cmd+K command runs ReadStrategy + dialogue VoiceStrategy through bus."""

    async def test_command_publishes_persona_delta_and_voice_utterance_to_bus(
        self,
    ) -> None:
        import asyncio
        from datetime import UTC, datetime
        from unittest.mock import AsyncMock, patch

        from app.adapters.api.command_route import _run_command_pipeline
        from app.adapters.sse.event_bus import SessionEventBus
        from app.domain.context import VisitorContext
        from app.domain.persona import Observation, Persona, SignalRef
        from app.domain.strategies.voice import VoiceUtterance, VoiceUtteranceList

        ctx = VisitorContext(
            referrer="https://www.linkedin.com/x", command="show me langgraph"
        )
        persona = Persona(
            rationale="explicit query",
            observations=[
                Observation(
                    dimension="intent",
                    value="evaluating",
                    confidence=0.7,
                    rationale="explicit ask",
                    source_signals=[SignalRef(kind="signal", id="cmd")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.8,
        )
        utterances = VoiceUtteranceList(
            utterances=[
                VoiceUtterance(
                    voice_tag="dialogue", utterance_kind="question", content="q"
                ),
                VoiceUtterance(
                    voice_tag="dialogue", utterance_kind="answer", content="a"
                ),
            ]
        )
        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe("cmd-session"):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch(
                "app.adapters.api.command_route.evaluate_persona",
                new=AsyncMock(return_value=persona),
            ),
            patch(
                "app.adapters.api.command_route.evaluate_voice",
                new=AsyncMock(return_value=utterances),
            ),
        ):
            await _run_command_pipeline(ctx, "cmd-session", AsyncMock(), bus)

        await asyncio.wait_for(consumer, timeout=1.0)
        assert "persona:delta" in received[0]
        assert "voice:utterance" in received[1]
