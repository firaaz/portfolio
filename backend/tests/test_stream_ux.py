"""Tests for UX protocol SSE stream."""

import json

from starlette.testclient import TestClient

from app.main import app


class TestStreamUX:
    """Stream route emits UX protocol StateSnapshot."""

    def test_stream_returns_ux_snapshot(self) -> None:
        """Snapshot contains ux globals and items with salience/group."""
        client = TestClient(app)
        response = client.get("/api/agent/stream")
        events = response.text.strip().split("\n\n")
        first = json.loads(events[0].removeprefix("data: "))
        assert first["type"] == "STATE_SNAPSHOT"
        assert "ux" in first["snapshot"]
        assert "tempo" in first["snapshot"]["ux"]
        assert "agency" in first["snapshot"]["ux"]
        items = first["snapshot"]["items"]
        assert len(items) == 13
        assert "salience" in items[0]
        assert "group" in items[0]
