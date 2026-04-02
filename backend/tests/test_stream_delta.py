"""Tests for StateDelta emission when LLM refines importance scores."""

import json
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest, ManifestItem
from app.main import app

client = TestClient(app)


def _fake_llm_port(manifest: Manifest) -> object:
    """Create a fake LLM port that returns a predetermined manifest."""

    class _Fake:
        async def assemble_manifest(
            self,
            context: VisitorContext,
            catalog: list[ContentItem],
        ) -> Manifest:
            return manifest

    return _Fake()


def _refined_manifest(items: list[ManifestItem]) -> Manifest:
    """Build a manifest with tweaked importance scores."""
    tweaked = [
        ManifestItem(
            id=item.id,
            importance=min(item.importance + 0.1, 1.0),
            molecule=item.molecule,
            data=item.data,
        )
        for item in items
    ]
    return Manifest(items=tweaked)


class TestStreamWithDelta:
    """When an LLM is available, stream emits both snapshot and delta."""

    def test_emits_snapshot_and_delta(self) -> None:
        response = client.get("/api/agent/stream")
        default_items = json.loads(
            response.text.strip().split("\n")[0][len("data:") :],
        )["snapshot"]["manifest"]["items"]

        refined = _refined_manifest(
            [ManifestItem(**item) for item in default_items],
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
        assert events[1]["type"] == "STATE_DELTA"

    def test_delta_contains_updates(self) -> None:
        response = client.get("/api/agent/stream")
        default_items = json.loads(
            response.text.strip().split("\n")[0][len("data:") :],
        )["snapshot"]["manifest"]["items"]

        refined = _refined_manifest(
            [ManifestItem(**item) for item in default_items],
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
        delta = events[1]
        updates = delta["delta"]["updates"]
        assert len(updates) == 13
        for update in updates:
            assert "id" in update
            assert 0.0 <= update["importance"] <= 1.0

    def test_no_delta_when_llm_unavailable(self) -> None:
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
