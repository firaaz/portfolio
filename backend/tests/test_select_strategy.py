"""Tests for the Select evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog
    return load_catalog()


class TestSelectStrategy:
    def test_builds_prompt_with_referrer(self) -> None:
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(referrer="https://linkedin.com/in/test"),
        )
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "linkedin" in prompt.lower()
        assert "hero" in prompt

    def test_builds_prompt_for_direct(self) -> None:
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        profile = VisitorProfile(session_id="s1", context=VisitorContext())
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "direct" in prompt.lower()

    def test_result_schema_is_intelligence_result(self) -> None:
        from app.domain.intelligence import IntelligenceResult
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        assert strategy.result_schema() is IntelligenceResult

    def test_model_config_low_temperature(self) -> None:
        from app.domain.strategies.select import SelectStrategy

        strategy = SelectStrategy()
        config = strategy.model_config()
        assert config.temperature <= 0.2

    def test_name(self) -> None:
        from app.domain.strategies.select import SelectStrategy

        assert SelectStrategy().name == "select"
