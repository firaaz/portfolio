"""Tests for ux:salience event emission when LLM refines salience scores."""

import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.ux import UXGlobals, UXItem, UXState
from app.main import app

client = TestClient(app)


def _fake_llm_port(ux_state: UXState) -> object:
    """Create a fake LLM port that returns a predetermined UX state."""

    class _Fake:
        async def assemble_ux_state(
            self,
            context: VisitorContext,
            catalog: list[ContentItem],
        ) -> UXState:
            return ux_state

    return _Fake()


def _refined_state(items: list[UXItem]) -> UXState:
    """Build a UX state with tweaked salience scores."""
    tweaked = [
        UXItem(
            id=item.id,
            salience=min(item.salience + 0.1, 1.0),
            group=item.group,
            molecule=item.molecule,
            data=item.data,
        )
        for item in items
    ]
    return UXState(ux=UXGlobals(), items=tweaked)


class TestStreamWithSalience:
    """When an LLM is available, stream emits snapshot and salience event."""

    def test_emits_snapshot_and_salience(self) -> None:
        response = client.get("/api/agent/stream")
        default_items = json.loads(
            response.text.strip().split("\n")[0][len("data:") :],
        )["snapshot"]["items"]

        refined = _refined_state(
            [UXItem(**item) for item in default_items],
        )
        fake = _fake_llm_port(refined)

        with patch(
            "app.adapters.api.stream_route._get_llm_port",
            return_value=fake,
        ):
            response = client.get("/api/agent/stream")

        events = [
            json.loads(line[len("data:") :].strip())
            for line in response.text.strip().split("\n")
            if line.startswith("data:")
        ]

        assert len(events) == 2
        assert events[0]["type"] == "STATE_SNAPSHOT"
        assert events[1]["type"] == "CUSTOM"
        assert events[1]["custom"]["eventType"] == "ux:salience"

    def test_salience_event_contains_items(self) -> None:
        response = client.get("/api/agent/stream")
        default_items = json.loads(
            response.text.strip().split("\n")[0][len("data:") :],
        )["snapshot"]["items"]

        refined = _refined_state(
            [UXItem(**item) for item in default_items],
        )
        fake = _fake_llm_port(refined)

        with patch(
            "app.adapters.api.stream_route._get_llm_port",
            return_value=fake,
        ):
            response = client.get("/api/agent/stream")

        events = [
            json.loads(line[len("data:") :].strip())
            for line in response.text.strip().split("\n")
            if line.startswith("data:")
        ]
        salience_events = [
            e
            for e in events
            if e["type"] == "CUSTOM" and e["custom"]["eventType"] == "ux:salience"
        ]
        assert len(salience_events) == 1
        items = salience_events[0]["custom"]["items"]
        assert len(items) == 13
        for item in items:
            assert "id" in item
            assert 0.0 <= item["salience"] <= 1.0

    def test_no_salience_event_when_llm_unavailable(self) -> None:
        with patch(
            "app.adapters.api.stream_route._get_llm_port",
            return_value=None,
        ):
            response = client.get("/api/agent/stream")

        events = [
            json.loads(line[len("data:") :].strip())
            for line in response.text.strip().split("\n")
            if line.startswith("data:")
        ]
        assert len(events) == 1
        assert events[0]["type"] == "STATE_SNAPSHOT"
