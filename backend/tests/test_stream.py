"""SSE stream endpoint contract tests."""

import asyncio
import json

from fastapi.testclient import TestClient

from app.adapters.api.stream_route import _generate_stream
from app.adapters.sse.event_bus import get_event_bus
from app.domain.context import VisitorContext
from app.main import app

client = TestClient(app)


class TestStreamEndpoint:
    """GET /api/agent/stream returns AG-UI UX StateSnapshot via SSE."""

    def test_returns_event_stream_content_type(self) -> None:
        response = client.get("/api/agent/stream")
        assert response.headers["content-type"].startswith("text/event-stream")

    def test_contains_state_snapshot_data(self) -> None:
        response = client.get("/api/agent/stream")
        body = response.text
        assert "data:" in body
        assert "STATE_SNAPSHOT" in body

    def test_snapshot_has_valid_ux_state(self) -> None:
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
        assert "ux" in payload["snapshot"]
        items = payload["snapshot"]["items"]
        assert len(items) == 13

        for item in items:
            assert 0.0 <= item["salience"] <= 1.0
            assert item["id"]
            assert item["molecule"]


class TestStreamSessionSubscription:
    """When session_id is provided, the stream subscribes to the event bus."""

    async def test_stream_yields_bus_events_for_session_id(self) -> None:
        """After the initial cascade, events published to the bus reach the stream."""
        bus = get_event_bus()
        session_id = "test-stream-sub-sid"
        context = VisitorContext()

        gen = _generate_stream(context, session_id=session_id)
        # Drain the deterministic prefix: STATE_SNAPSHOT + signal event.
        # With LLM disabled (autouse fixture), no LLM cascade follows.
        snapshot = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        signal = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        assert "STATE_SNAPSHOT" in snapshot
        assert "data:" in signal

        # Schedule a publish, then read the next event from the stream.
        await asyncio.sleep(0)  # let generator reach the subscribe loop
        publish = asyncio.create_task(
            bus.publish(session_id, 'data: {"type":"ADAPTED-PAYLOAD"}\n\n')
        )
        adapted = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        await publish
        assert "ADAPTED-PAYLOAD" in adapted

        await gen.aclose()

    async def test_stream_without_session_id_terminates_after_initial_cascade(
        self,
    ) -> None:
        """Backward-compat: no session_id means no subscription, generator ends."""
        context = VisitorContext()
        gen = _generate_stream(context)  # no session_id

        # Drain everything; with LLM disabled, prefix is snapshot + signal only.
        events = []
        async for ev in gen:
            events.append(ev)
            if len(events) >= 10:  # safety bound
                break
        assert any("STATE_SNAPSHOT" in e for e in events)
        # Without session_id the generator must terminate (no hanging subscribe).
        assert len(events) <= 5
