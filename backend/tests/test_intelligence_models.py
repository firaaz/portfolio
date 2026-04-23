"""Tests for intelligence result domain models."""

import pytest
from pydantic import ValidationError


class TestItemResult:
    def test_valid_item(self) -> None:
        from app.domain.intelligence import ItemResult

        item = ItemResult(id="hero", importance=0.95, emphasis=["name", "title"])
        assert item.id == "hero"
        assert item.importance == 0.95
        assert item.emphasis == ["name", "title"]

    def test_importance_bounds(self) -> None:
        from app.domain.intelligence import ItemResult

        with pytest.raises(ValidationError):
            ItemResult(id="x", importance=1.5)
        with pytest.raises(ValidationError):
            ItemResult(id="x", importance=-0.1)

    def test_optional_fields_default_none(self) -> None:
        from app.domain.intelligence import ItemResult

        item = ItemResult(id="hero", importance=0.9)
        assert item.emphasis is None
        assert item.generated is None


class TestBridgeAnnotation:
    def test_valid_bridge(self) -> None:
        from app.domain.intelligence import BridgeAnnotation

        bridge = BridgeAnnotation(
            source_id="project-salama",
            target_id="experience-current",
            text="Your interest in architecture connects to this role.",
            grounding=["LangGraph", "event-driven"],
        )
        assert bridge.source_id == "project-salama"
        assert len(bridge.grounding) == 2

    def test_grounding_can_be_empty(self) -> None:
        from app.domain.intelligence import BridgeAnnotation

        bridge = BridgeAnnotation(
            source_id="a", target_id="b", text="t", grounding=[]
        )
        assert bridge.grounding == []


class TestIntelligenceResult:
    def test_valid_result(self) -> None:
        from app.domain.intelligence import IntelligenceResult, ItemResult

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.95)]
        )
        assert len(result.items) == 1
        assert result.bridges is None

    def test_requires_at_least_one_item(self) -> None:
        from app.domain.intelligence import IntelligenceResult

        with pytest.raises(ValidationError):
            IntelligenceResult(items=[])
