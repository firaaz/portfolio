"""Tests for CUSTOM decision events in SSE streams."""

import json
from unittest.mock import patch

from starlette.testclient import TestClient

from app.domain.content import ContentItem, content_to_manifest
from app.domain.manifest import Manifest, ManifestItem
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

    async def assemble_manifest(
        self,
        context: object,
        catalog: list[ContentItem],
    ) -> Manifest:
        items = []
        for item in catalog:
            importance = 0.85 if item.id == "contact" else 0.5
            if item.molecule == "hero":
                importance = 0.95
            items.append(
                ManifestItem(
                    id=item.id,
                    importance=importance,
                    molecule=item.molecule,
                    data=item.data,
                ),
            )
        return Manifest(items=items)


class _FakeDefaultLLM:
    """Fake LLM that returns default-equivalent scores."""

    async def assemble_manifest(
        self,
        context: object,
        catalog: list[ContentItem],
    ) -> Manifest:
        return content_to_manifest(catalog)


class TestStreamDecisionEvent:
    """GET /api/agent/stream emits CUSTOM decision events."""

    @patch("app.adapters.api.stream_route._get_cache")
    @patch("app.adapters.api.stream_route._get_llm_port")
    def test_emits_decision_event_with_delta(
        self,
        mock_llm_port: object,
        mock_cache: object,
    ) -> None:
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

        custom_events = [e for e in events if e.get("type") == "CUSTOM"]
        assert len(custom_events) == 1
        decision = custom_events[0]["custom"]
        assert decision["eventType"] == "DECISION"
        assert "reasoning" in decision["decision"]
        assert len(decision["decision"]["reasoning"]) > 0

    @patch("app.adapters.api.stream_route._get_cache")
    @patch("app.adapters.api.stream_route._get_llm_port")
    def test_no_decision_event_when_unchanged(
        self,
        mock_llm_port: object,
        mock_cache: object,
    ) -> None:
        from app.adapters.cache.memory_cache import MemoryCache

        mock_llm_port.return_value = _FakeDefaultLLM()
        mock_cache.return_value = MemoryCache(capacity=32)

        response = client.get("/api/agent/stream")
        events = _parse_events(response.text)

        custom_events = [e for e in events if e.get("type") == "CUSTOM"]
        assert len(custom_events) == 0


class TestCommandDecisionEvent:
    """POST /api/agent/command emits CUSTOM decision events."""

    @patch("app.adapters.api.command_route._get_llm_port")
    def test_emits_decision_event_for_command(
        self,
        mock_llm_port: object,
    ) -> None:
        from app.adapters.content.yaml_loader import load_catalog

        catalog = load_catalog()
        mock_llm_port.return_value = _FakeLLM(catalog)

        response = client.post(
            "/api/agent/command",
            json={"text": "show contact info"},
        )
        assert response.status_code == 200
        events = _parse_events(response.text)

        custom_events = [e for e in events if e.get("type") == "CUSTOM"]
        assert len(custom_events) == 1
        decision = custom_events[0]["custom"]["decision"]
        reasoning = decision["reasoning"].lower()
        assert "command" in reasoning or "contact" in reasoning
