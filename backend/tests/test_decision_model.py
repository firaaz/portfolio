"""Tests for DecisionRecord domain model."""

import pytest
from pydantic import ValidationError

from app.domain.decision import DecisionRecord, ImportanceChange, build_decision
from app.domain.manifest import Manifest, ManifestItem


class TestImportanceChange:
    """Validates ImportanceChange model constraints."""

    def test_valid_elevated(self) -> None:
        change = ImportanceChange(item_id="contact", direction="elevated")
        assert change.item_id == "contact"
        assert change.direction == "elevated"

    def test_valid_reduced(self) -> None:
        change = ImportanceChange(item_id="skill-python", direction="reduced")
        assert change.direction == "reduced"

    def test_rejects_invalid_direction(self) -> None:
        with pytest.raises(ValidationError):
            ImportanceChange(item_id="contact", direction="boosted")


class TestDecisionRecord:
    """Validates DecisionRecord model constraints."""

    def test_valid_record(self) -> None:
        record = DecisionRecord(
            referrer_type="linkedin",
            command=None,
            changes=[ImportanceChange(item_id="contact", direction="elevated")],
            reasoning="Detected linkedin referrer — elevated contact",
        )
        assert record.referrer_type == "linkedin"
        assert record.command is None
        assert len(record.changes) == 1

    def test_with_command(self) -> None:
        record = DecisionRecord(
            referrer_type="direct",
            command="show AI projects",
            changes=[ImportanceChange(item_id="salama-ai", direction="elevated")],
            reasoning="Command requested AI projects — elevated salama-ai",
        )
        assert record.command == "show AI projects"

    def test_rejects_empty_reasoning(self) -> None:
        with pytest.raises(ValidationError):
            DecisionRecord(
                referrer_type="direct",
                command=None,
                changes=[],
                reasoning="",
            )


class TestBuildDecision:
    """Tests deterministic reasoning generation."""

    def _make_manifest(self, scores: dict[str, float]) -> Manifest:
        return Manifest(
            items=[
                ManifestItem(id=k, importance=v, molecule="test", data={})
                for k, v in scores.items()
            ],
        )

    def test_linkedin_referrer_elevated(self) -> None:
        default = self._make_manifest({"contact": 0.5, "hero": 0.95})
        refined = self._make_manifest({"contact": 0.85, "hero": 0.95})
        record = build_decision(
            default=default,
            refined=refined,
            referrer_type="linkedin",
            command=None,
        )
        assert record.referrer_type == "linkedin"
        elevated = [c for c in record.changes if c.item_id == "contact"]
        assert elevated and elevated[0].direction == "elevated"
        assert "linkedin" in record.reasoning.lower()

    def test_command_elevated(self) -> None:
        default = self._make_manifest({"salama-ai": 0.5, "hero": 0.95})
        refined = self._make_manifest({"salama-ai": 0.85, "hero": 0.95})
        record = build_decision(
            default=default,
            refined=refined,
            referrer_type="direct",
            command="show AI projects",
        )
        assert record.command == "show AI projects"
        elevated = [c for c in record.changes if c.item_id == "salama-ai"]
        assert elevated and elevated[0].direction == "elevated"
        assert "command" in record.reasoning.lower()

    def test_reduced_items_tracked(self) -> None:
        default = self._make_manifest({"skill-python": 0.5, "hero": 0.95})
        refined = self._make_manifest({"skill-python": 0.2, "hero": 0.95})
        record = build_decision(
            default=default,
            refined=refined,
            referrer_type="direct",
            command=None,
        )
        reduced = [c for c in record.changes if c.item_id == "skill-python"]
        assert reduced and reduced[0].direction == "reduced"

    def test_unchanged_items_excluded(self) -> None:
        default = self._make_manifest({"hero": 0.95, "contact": 0.5})
        refined = self._make_manifest({"hero": 0.95, "contact": 0.85})
        record = build_decision(
            default=default,
            refined=refined,
            referrer_type="linkedin",
            command=None,
        )
        assert not any(c.item_id == "hero" for c in record.changes)
