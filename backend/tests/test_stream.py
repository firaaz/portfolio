"""SSE stream endpoint contract tests."""

import json

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestStreamEndpoint:
    """GET /api/agent/stream returns AG-UI StateSnapshot via SSE."""

    def test_returns_event_stream_content_type(self) -> None:
        response = client.get("/api/agent/stream")
        assert response.headers["content-type"].startswith("text/event-stream")

    def test_contains_state_snapshot_data(self) -> None:
        response = client.get("/api/agent/stream")
        body = response.text
        assert "data:" in body
        assert "STATE_SNAPSHOT" in body

    def test_snapshot_has_valid_manifest(self) -> None:
        response = client.get("/api/agent/stream")
        lines = response.text.strip().split("\n")
        data_line = None
        for line in lines:
            if line.startswith("data:"):
                data_line = line[len("data:") :].strip()
                break

        assert data_line is not None, "No data line found in SSE stream"
        payload = json.loads(data_line)

        assert payload["type"] == "STATE_SNAPSHOT"
        manifest_items = payload["snapshot"]["items"]
        assert len(manifest_items) == 13

        for item in manifest_items:
            assert 0.0 <= item["importance"] <= 1.0
            assert item["id"]
            assert item["molecule"]
