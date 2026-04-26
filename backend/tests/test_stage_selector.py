"""Tests for select_voice — pure function (persona, steer) -> voice_tag."""

from app.domain.persona import Persona
from app.domain.stage import VisitorSteer, select_voice


def _persona(trust: float) -> Persona:
    return Persona(rationale="r", observations=[], trust=trust)


class TestSelectVoice:
    def test_trust_below_0_4_returns_whisper(self) -> None:
        assert select_voice(_persona(0.0), None) == "whisper"
        assert select_voice(_persona(0.39), None) == "whisper"

    def test_trust_at_0_4_returns_letter(self) -> None:
        assert select_voice(_persona(0.4), None) == "letter"
        assert select_voice(_persona(0.69), None) == "letter"

    def test_trust_at_0_7_returns_dialogue(self) -> None:
        assert select_voice(_persona(0.7), None) == "dialogue"
        assert select_voice(_persona(1.0), None) == "dialogue"

    def test_visitor_steer_overrides_trust(self) -> None:
        steer = VisitorSteer(requested_voice="dialogue")
        assert select_voice(_persona(0.0), steer) == "dialogue"

    def test_visitor_steer_can_request_any_voice_tag(self) -> None:
        steer = VisitorSteer(requested_voice="podcast")
        assert select_voice(_persona(0.5), steer) == "podcast"
