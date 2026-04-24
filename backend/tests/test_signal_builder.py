"""Unit tests for signal_builder — pre-LLM ux:signal synthesis."""

import json

from app.adapters.api.signal_builder import build_signal_event
from app.domain.context import VisitorContext


class TestBuildSignalEvent:
    """Tests for build_signal_event synthesizer."""

    def test_linkedin_referrer_produces_leadership_reasoning(self) -> None:
        ctx = VisitorContext(referrer="https://linkedin.com/in/example")
        event = build_signal_event(ctx)
        assert "linkedin" in event.lower() or "leadership" in event.lower()
        assert '"eventType": "ux:signal"' in event

    def test_github_referrer_produces_technical_reasoning(self) -> None:
        ctx = VisitorContext(referrer="https://github.com/example")
        event = build_signal_event(ctx)
        assert "github" in event.lower() or "technical" in event.lower()

    def test_unknown_referrer_uses_lower_confidence(self) -> None:
        ctx = VisitorContext.model_construct(referrer_type="unknown")
        event = build_signal_event(ctx)
        payload_line = event.strip().removeprefix("data: ")
        parsed = json.loads(payload_line)
        confidence = parsed["custom"]["confidence"]
        assert 0.2 <= confidence <= 0.6

    def test_known_referrer_uses_higher_confidence(self) -> None:
        ctx = VisitorContext(referrer="https://linkedin.com/in/example")
        event = build_signal_event(ctx)
        payload_line = event.strip().removeprefix("data: ")
        parsed = json.loads(payload_line)
        confidence = parsed["custom"]["confidence"]
        assert 0.6 <= confidence <= 0.85

    def test_event_format_is_sse_compliant(self) -> None:
        ctx = VisitorContext(referrer="https://linkedin.com/in/example")
        event = build_signal_event(ctx)
        assert event.startswith("data: ")
        assert event.endswith("\n\n")
