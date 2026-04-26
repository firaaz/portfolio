"""Tests for VoiceStrategy — voice-tag-parameterized utterance generation."""

import pytest

from app.domain.context import VisitorContext
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategies.voice import (
    VOICE_PROMPTS,
    VoiceStrategy,
    VoiceUtteranceList,
)


def _profile() -> VisitorProfile:
    return VisitorProfile(session_id="t", context=VisitorContext())


def _persona(trust: float = 0.3) -> Persona:
    return Persona(rationale="early-read", observations=[], trust=trust)


class TestVoicePrompts:
    def test_whisper_prompt_registered(self) -> None:
        assert "whisper" in VOICE_PROMPTS
        prompt = VOICE_PROMPTS["whisper"].lower()
        assert "italic" in prompt or "marginal" in prompt

    def test_whisper_prompt_instructs_short_lines(self) -> None:
        prompt = VOICE_PROMPTS["whisper"].lower()
        assert "short" in prompt or "one line" in prompt


class TestVoiceStrategy:
    def test_name_includes_voice_tag(self) -> None:
        strat = VoiceStrategy(voice_tag="whisper")
        assert strat.name == "voice:whisper"

    def test_result_schema_is_voice_utterance_list(self) -> None:
        assert VoiceStrategy(voice_tag="whisper").result_schema() is VoiceUtteranceList

    def test_unknown_voice_tag_raises_on_init(self) -> None:
        with pytest.raises(ValueError):
            VoiceStrategy(voice_tag="nonexistent")

    def test_build_prompt_includes_persona_rationale_and_trust(self) -> None:
        strat = VoiceStrategy(voice_tag="whisper")
        strat.persona = _persona(trust=0.3)
        prompt = strat.build_prompt(_profile(), [])
        assert "0.30" in prompt or "trust" in prompt.lower()
        assert "early-read" in prompt
