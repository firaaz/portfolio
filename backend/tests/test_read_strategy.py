"""Tests for ReadStrategy — agent's persona-inference prompt builder."""

from app.domain.context import VisitorContext
from app.domain.persona import Persona
from app.domain.session import BehavioralSignal, VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT, ReadStrategy


class TestReadStrategySystemPrompt:
    def test_prompt_seeds_role_intent_depth_source_dimensions(self) -> None:
        # Soft conventions live in the prompt, not the type. Verify they're seeded.
        for label in ("role", "intent", "depth", "source"):
            assert label in SYSTEM_PROMPT

    def test_prompt_instructs_multivoice_emission(self) -> None:
        # Critical: prompt must tell the agent to emit MULTIPLE observations
        # in the same dimension when patterns match multiple roles. Pin the
        # exact phrase — "multi" alone matches "multi-modal" and won't catch
        # a regression that deletes the multivoice rule.
        assert "MULTIVOICE" in SYSTEM_PROMPT.upper()
        assert "EMIT MULTIPLE" in SYSTEM_PROMPT

    def test_prompt_requires_source_signal_references(self) -> None:
        assert "source_signals" in SYSTEM_PROMPT


class TestReadStrategy:
    def _profile(self) -> VisitorProfile:
        return VisitorProfile(
            session_id="t",
            context=VisitorContext(referrer="https://www.linkedin.com/foo"),
        )

    def test_name_is_read(self) -> None:
        assert ReadStrategy().name == "read"

    def test_result_schema_is_persona(self) -> None:
        assert ReadStrategy().result_schema() is Persona

    def test_build_prompt_includes_referrer_type(self) -> None:
        profile = self._profile()
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "linkedin" in prompt.lower()

    def test_build_prompt_includes_recent_signals(self) -> None:
        profile = self._profile()
        for i in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell",
                    card_id=f"card-{i}",
                    duration_ms=1500,
                    timestamp=float(i),
                )
            )
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "card-0" in prompt
        assert "card-1" in prompt
        assert "card-2" in prompt
        assert "dwell" in prompt

    def test_build_prompt_includes_command_when_present(self) -> None:
        profile = self._profile()
        profile.context.command = "show me the langgraph project"
        prompt = ReadStrategy().build_prompt(profile, [])
        assert "langgraph" in prompt.lower()

    def test_model_config_uses_low_temperature(self) -> None:
        cfg = ReadStrategy().model_config()
        assert cfg.temperature <= 0.4
        assert cfg.max_tokens >= 512
