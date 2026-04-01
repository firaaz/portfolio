"""Manifest domain model contract tests."""

import pytest
from pydantic import ValidationError

from app.domain.manifest import Manifest, ManifestItem


class TestManifestItem:
    """ManifestItem validates importance range and required fields."""

    def test_valid_item(self) -> None:
        item = ManifestItem(
            id="hero",
            importance=0.9,
            molecule="hero",
            data={"name": "Firaaz"},
        )
        assert item.id == "hero"
        assert item.importance == 0.9

    def test_importance_at_zero(self) -> None:
        item = ManifestItem(id="x", importance=0.0, molecule="skill", data={})
        assert item.importance == 0.0

    def test_importance_at_one(self) -> None:
        item = ManifestItem(id="x", importance=1.0, molecule="hero", data={})
        assert item.importance == 1.0

    def test_importance_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ManifestItem(id="x", importance=-0.1, molecule="hero", data={})

    def test_importance_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ManifestItem(id="x", importance=1.1, molecule="hero", data={})


class TestManifest:
    """Manifest requires a non-empty items list."""

    def test_valid_manifest(self) -> None:
        item = ManifestItem(id="hero", importance=1.0, molecule="hero", data={})
        manifest = Manifest(items=[item])
        assert len(manifest.items) == 1

    def test_empty_items_rejected(self) -> None:
        with pytest.raises(ValidationError):
            Manifest(items=[])
