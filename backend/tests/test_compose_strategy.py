"""Tests for the Compose evaluation strategy."""

from app.domain.context import VisitorContext
from app.domain.session import VisitorProfile


def _load_catalog():
    from app.adapters.content.yaml_loader import load_catalog
    return load_catalog()


class TestComposeStrategy:
    def test_builds_prompt_with_query(self) -> None:
        from app.domain.strategies.compose import ComposeStrategy

        strategy = ComposeStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(command="show me distributed systems experience"),
        )
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "distributed systems" in prompt.lower()

    def test_includes_full_catalog_data(self) -> None:
        from app.domain.strategies.compose import ComposeStrategy

        strategy = ComposeStrategy()
        profile = VisitorProfile(
            session_id="s1",
            context=VisitorContext(command="AI projects"),
        )
        prompt = strategy.build_prompt(profile, _load_catalog())
        assert "LangGraph" in prompt or "langgraph" in prompt.lower()

    def test_name(self) -> None:
        from app.domain.strategies.compose import ComposeStrategy

        assert ComposeStrategy().name == "compose"

    def test_model_config_higher_temperature(self) -> None:
        from app.domain.strategies.compose import ComposeStrategy

        config = ComposeStrategy().model_config()
        assert config.temperature >= 0.3
        assert config.max_tokens >= 2048
