"""Tests verifying decision events are not emitted in UX protocol streams."""

import json
from unittest.mock import patch

from starlette.testclient import TestClient

from app.domain.content import ContentItem
from app.domain.ux import UXGlobals, UXItem, UXState
from app.main import app

client = TestClient(app)


def _parse_events(response_text: str) -> list[dict]:
    """Parse SSE text into a list of event payloads."""
    events = []
    for line in response_text.strip().split("\n\n"):
        for part in line.split("\n"):
            if part.startswith("data: "):
                events.append(json.loads(part[6:]))
    return events


class _FakeLLM:
    """Fake LLM that returns elevated contact scores."""

    def __init__(self, catalog: list[ContentItem]) -> None:
        self._catalog = catalog

    async def assemble_ux_state(
        self,
        context: object,
        catalog: list[ContentItem],
    ) -> UXState:
        items = []
        for item in catalog:
            salience = 0.85 if item.id == "contact" else 0.5
            if item.molecule == "hero":
                salience = 0.95
            items.append(
                UXItem(
                    id=item.id,
                    salience=salience,
                    group=item.default_group,
                    molecule=item.molecule,
                    data=item.data,
                ),
            )
        return UXState(ux=UXGlobals(), items=items)


class TestStreamNoDecisionEvent:
    """UX protocol streams do not emit DECISION events."""

    @patch("app.adapters.api.stream_route._get_cache")
    @patch("app.adapters.api.stream_route._get_llm_port")
    def test_no_decision_event_in_stream(
        self,
        mock_llm_port: object,
        mock_cache: object,
    ) -> None:
        """Stream emits snapshot and salience but no DECISION event."""
        from app.adapters.cache.memory_cache import MemoryCache
        from app.adapters.content.yaml_loader import load_catalog

        catalog = load_catalog()
        mock_llm_port.return_value = _FakeLLM(catalog)
        mock_cache.return_value = MemoryCache(capacity=32)

        response = client.get(
            "/api/agent/stream",
            headers={"Referer": "https://linkedin.com/in/someone"},
        )
        assert response.status_code == 200
        events = _parse_events(response.text)

        decision_events = [
            e
            for e in events
            if e.get("type") == "CUSTOM"
            and e.get("custom", {}).get("eventType") == "DECISION"
        ]
        assert len(decision_events) == 0

    @patch("app.adapters.api.command_route._get_llm_port")
    def test_no_decision_event_in_command(
        self,
        mock_llm_port: object,
    ) -> None:
        """Command stream emits snapshot and salience but no DECISION."""
        from app.adapters.content.yaml_loader import load_catalog

        catalog = load_catalog()
        mock_llm_port.return_value = _FakeLLM(catalog)

        response = client.post(
            "/api/agent/command",
            json={"text": "show contact info", "session_id": "test-session"},
        )
        assert response.status_code == 200
        events = _parse_events(response.text)

        decision_events = [
            e
            for e in events
            if e.get("type") == "CUSTOM"
            and e.get("custom", {}).get("eventType") == "DECISION"
        ]
        assert len(decision_events) == 0
