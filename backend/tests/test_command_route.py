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
            json={"text": "show contact"},
        )
        assert response.headers["content-type"].startswith("text/event-stream")

    def test_contains_state_snapshot(self) -> None:
        response = client.post(
            "/api/agent/command",
            json={"text": "show contact"},
        )
        events = _parse_sse_events(response.text)
        types = [e["type"] for e in events]
        assert "STATE_SNAPSHOT" in types

    def test_snapshot_has_valid_ux_state(self) -> None:
        response = client.post(
            "/api/agent/command",
            json={"text": "show contact"},
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
