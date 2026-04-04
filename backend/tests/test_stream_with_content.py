"""BDD: SSE stream serves UX state built from content catalog."""

import json

from fastapi.testclient import TestClient

from app.adapters.content.yaml_loader import load_catalog
from app.main import app

client = TestClient(app)


class TestStreamServesContentCatalog:
    """Given catalog loaded / When SSE stream / Then UX state matches catalog."""

    def test_stream_item_ids_match_catalog(self) -> None:
        """Given catalog / When stream / Then IDs match exactly."""
        catalog = load_catalog()
        catalog_ids = {item.id for item in catalog}

        response = client.get("/api/agent/stream")
        lines = response.text.strip().split("\n")
        data_line = next(line for line in lines if line.startswith("data: "))
        payload = json.loads(data_line.removeprefix("data: "))
        stream_ids = {item["id"] for item in payload["snapshot"]["items"]}

        assert stream_ids == catalog_ids

    def test_stream_salience_matches_catalog_defaults(self) -> None:
        """Given catalog / When stream / Then salience = default_salience."""
        catalog = load_catalog()
        expected = {item.id: item.default_salience for item in catalog}

        response = client.get("/api/agent/stream")
        lines = response.text.strip().split("\n")
        data_line = next(line for line in lines if line.startswith("data: "))
        payload = json.loads(data_line.removeprefix("data: "))
        items = payload["snapshot"]["items"]
        actual = {item["id"]: item["salience"] for item in items}

        assert actual == expected

    def test_stream_data_matches_catalog_content(self) -> None:
        """Given catalog / When stream / Then data payloads match."""
        catalog = load_catalog()
        expected = {item.id: item.data for item in catalog}

        response = client.get("/api/agent/stream")
        lines = response.text.strip().split("\n")
        data_line = next(line for line in lines if line.startswith("data: "))
        payload = json.loads(data_line.removeprefix("data: "))
        items = payload["snapshot"]["items"]
        actual = {item["id"]: item["data"] for item in items}

        assert actual == expected
