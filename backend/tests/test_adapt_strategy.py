"""Tests for the Adapt evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import BehavioralSignal, VisitorProfile


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog

    return load_catalog()


def _profile_with_signals() -> VisitorProfile:
    profile = VisitorProfile(
        session_id="s1",
        context=VisitorContext(referrer="https://linkedin.com/in/test"),
    )
    for i in range(5):
        profile.accumulate(
            BehavioralSignal(
                type="dwell", card_id="skills", duration_ms=3000, timestamp=float(i)
            )
        )
    return profile


class TestAdaptStrategy:
    def test_builds_prompt_with_behavioral_signals(self) -> None:
        from app.domain.strategies.adapt import AdaptStrategy

        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "skills" in prompt.lower()
        assert "dwell" in prompt.lower()

    def test_renders_empty_interests_gracefully(self) -> None:
        from app.domain.strategies.adapt import AdaptStrategy

        # Interests derivation is retired pending the AdaptStrategy
        # invocation slice; prompt should render "none yet" rather than fail.
        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "Interests: none yet" in prompt

    def test_includes_confidence(self) -> None:
        from app.domain.strategies.adapt import AdaptStrategy

        strategy = AdaptStrategy()
        profile = _profile_with_signals()
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert str(round(profile.confidence, 2)) in prompt

    def test_name(self) -> None:
        from app.domain.strategies.adapt import AdaptStrategy

        assert AdaptStrategy().name == "adapt"

    def test_model_config_moderate_temperature(self) -> None:
        from app.domain.strategies.adapt import AdaptStrategy

        config = AdaptStrategy().model_config()
        assert config.temperature <= 0.4
        assert config.max_tokens >= 2048
