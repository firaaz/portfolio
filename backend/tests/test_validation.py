"""Tests for post-generation catalog validation."""

import pytest


class TestValidateIntelligenceResult:
    def test_valid_result_passes(self) -> None:
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        catalog_ids = {"hero", "contact", "project-salama"}
        result = IntelligenceResult(
            items=[
                ItemResult(id="hero", importance=0.95),
                ItemResult(id="contact", importance=0.8),
                ItemResult(id="project-salama", importance=0.7, emphasis=["title", "description"]),
            ]
        )
        errors = validate_result(
            result, catalog_ids, item_fields={"project-salama": {"title", "description", "tech"}}
        )
        assert errors == []

    def test_unknown_item_id_flagged(self) -> None:
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="nonexistent", importance=0.5)]
        )
        errors = validate_result(result, {"hero"}, item_fields={})
        assert any("nonexistent" in e for e in errors)

    def test_invalid_emphasis_field_flagged(self) -> None:
        from app.domain.intelligence import IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9, emphasis=["nonexistent_field"])]
        )
        errors = validate_result(
            result, {"hero"}, item_fields={"hero": {"name", "title", "subtitle", "summary"}}
        )
        assert any("nonexistent_field" in e for e in errors)

    def test_invalid_bridge_target_flagged(self) -> None:
        from app.domain.intelligence import BridgeAnnotation, IntelligenceResult, ItemResult
        from app.domain.validation import validate_result

        result = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.9)],
            bridges=[
                BridgeAnnotation(
                    source_id="hero", target_id="fake", text="t", grounding=["x"]
                )
            ],
        )
        errors = validate_result(result, {"hero"}, item_fields={})
        assert any("fake" in e for e in errors)
