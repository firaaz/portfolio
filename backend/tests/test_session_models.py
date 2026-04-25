"""Tests for behavioral signal and visitor profile models."""

import pytest
from pydantic import ValidationError


class TestBehavioralSignal:
    def test_valid_dwell(self) -> None:
        from app.domain.session import BehavioralSignal

        sig = BehavioralSignal(
            type="dwell", card_id="skills", duration_ms=3200, timestamp=1000.0
        )
        assert sig.type == "dwell"
        assert sig.card_id == "skills"

    def test_valid_types(self) -> None:
        from app.domain.session import BehavioralSignal

        for t in ("dwell", "skip", "click", "hover"):
            sig = BehavioralSignal(
                type=t, card_id="featured", duration_ms=100, timestamp=0.0
            )
            assert sig.type == t

    def test_invalid_type_rejected(self) -> None:
        from app.domain.session import BehavioralSignal

        with pytest.raises(ValidationError):
            BehavioralSignal(type="scroll", card_id="x", duration_ms=0, timestamp=0.0)


class TestSignalBatch:
    def test_valid_batch(self) -> None:
        from app.domain.session import BehavioralSignal, SignalBatch

        batch = SignalBatch(
            session_id="abc-123",
            signals=[
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=2000, timestamp=0.0
                )
            ],
        )
        assert batch.session_id == "abc-123"
        assert len(batch.signals) == 1


class TestVisitorProfile:
    def test_default_tier_is_one(self) -> None:
        from app.domain.context import VisitorContext
        from app.domain.session import VisitorProfile

        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(referrer="https://linkedin.com/in/test"),
        )
        assert profile.tier == 1
        assert profile.confidence == 0.0
        assert profile.dwell_map == {}
        assert profile.interests == []

    def test_accumulate_signal(self) -> None:
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(),
        )
        sig = BehavioralSignal(
            type="dwell", card_id="skills", duration_ms=3000, timestamp=1.0
        )
        profile.accumulate(sig)
        assert profile.dwell_map["skills"] == 3.0
        assert len(profile.signals) == 1

    def test_confidence_grows_with_signals(self) -> None:
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        for i in range(5):
            sig = BehavioralSignal(
                type="dwell", card_id="skills", duration_ms=2000, timestamp=float(i)
            )
            profile.accumulate(sig)
        assert profile.confidence > 0.0
        assert profile.confidence <= 1.0

    def test_tier_escalates_with_confidence(self) -> None:
        from app.domain.context import VisitorContext
        from app.domain.session import BehavioralSignal, VisitorProfile

        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        for i in range(2):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell",
                    card_id="featured",
                    duration_ms=5000,
                    timestamp=float(i),
                )
            )
        assert profile.tier == 1
        profile.accumulate(
            BehavioralSignal(
                type="dwell", card_id="featured", duration_ms=5000, timestamp=3.0
            )
        )
        assert profile.tier >= 2
