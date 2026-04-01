"""YAML content catalog loader — reads catalog.yaml into validated ContentItems."""

from pathlib import Path

import yaml

from app.domain.content import ContentItem

_CATALOG_PATH = Path(__file__).resolve().parents[4] / "content" / "catalog.yaml"


def load_catalog(path: Path = _CATALOG_PATH) -> list[ContentItem]:
    """Load and validate the content catalog from YAML."""
    raw = yaml.safe_load(path.read_text())
    return [ContentItem(**item) for item in raw["items"]]
