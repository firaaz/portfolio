"""Tests for VisitorContext model — referrer URL parsing."""

from app.domain.context import UserAgentSummary, Viewport, VisitorContext


class TestVisitorContext:
    """VisitorContext parses referrer URLs into known types."""

    def test_linkedin_referrer(self) -> None:
        ctx = VisitorContext(referrer="https://linkedin.com/in/someone")
        assert ctx.referrer_type == "linkedin"

    def test_linkedin_www_referrer(self) -> None:
        ctx = VisitorContext(referrer="https://www.linkedin.com/jobs/view/123")
        assert ctx.referrer_type == "linkedin"

    def test_github_referrer(self) -> None:
        ctx = VisitorContext(referrer="https://github.com/firaaz")
        assert ctx.referrer_type == "github"

    def test_direct_when_none(self) -> None:
        ctx = VisitorContext(referrer=None)
        assert ctx.referrer_type == "direct"

    def test_direct_when_empty(self) -> None:
        ctx = VisitorContext(referrer="")
        assert ctx.referrer_type == "direct"

    def test_direct_when_unknown_domain(self) -> None:
        ctx = VisitorContext(referrer="https://example.com/page")
        assert ctx.referrer_type == "direct"

    def test_malformed_url(self) -> None:
        ctx = VisitorContext(referrer="not-a-url")
        assert ctx.referrer_type == "direct"

    def test_preserves_raw_referrer(self) -> None:
        url = "https://linkedin.com/in/recruiter"
        ctx = VisitorContext(referrer=url)
        assert ctx.referrer == url


class TestVisitorContextCommand:
    """VisitorContext supports optional natural-language commands."""

    def test_command_defaults_to_none(self) -> None:
        ctx = VisitorContext()
        assert ctx.command is None

    def test_command_preserved_when_set(self) -> None:
        ctx = VisitorContext(command="show AI projects")
        assert ctx.command == "show AI projects"

    def test_referrer_type_still_computed_with_command(self) -> None:
        ctx = VisitorContext(
            referrer="https://linkedin.com/in/someone",
            command="show contact",
        )
        assert ctx.referrer_type == "linkedin"
        assert ctx.command == "show contact"


class TestVisitorContextExpansion:
    """VisitorContext carries first-paint signals: viewport, landing, UA summary."""

    def test_viewport_field_optional_and_typed(self) -> None:
        ctx = VisitorContext(
            viewport=Viewport(
                width=1440,
                height=900,
                pointer_type="mouse",
                prefers_reduced_motion=False,
            )
        )
        assert ctx.viewport is not None
        assert ctx.viewport.width == 1440
        assert ctx.viewport.height == 900
        assert ctx.viewport.pointer_type == "mouse"
        assert ctx.viewport.prefers_reduced_motion is False

    def test_viewport_defaults_when_omitted(self) -> None:
        assert VisitorContext().viewport is None

    def test_user_agent_summary_aggregated_only(self) -> None:
        ctx = VisitorContext(
            user_agent_summary=UserAgentSummary(family="Chrome", platform="macOS")
        )
        assert ctx.user_agent_summary is not None
        assert ctx.user_agent_summary.family == "Chrome"
        assert ctx.user_agent_summary.platform == "macOS"

    def test_user_agent_summary_defaults_when_omitted(self) -> None:
        assert VisitorContext().user_agent_summary is None

    def test_landing_path_optional(self) -> None:
        assert VisitorContext().landing_path is None
        assert VisitorContext(landing_path="/").landing_path == "/"
        assert VisitorContext(landing_path="/work").landing_path == "/work"

    def test_referrer_type_still_computed_with_expanded_fields(self) -> None:
        ctx = VisitorContext(
            referrer="https://linkedin.com/in/someone",
            viewport=Viewport(width=390, height=844, pointer_type="touch"),
            landing_path="/",
            user_agent_summary=UserAgentSummary(family="Safari", platform="iOS"),
        )
        assert ctx.referrer_type == "linkedin"
        assert ctx.viewport is not None
        assert ctx.viewport.pointer_type == "touch"
        assert ctx.landing_path == "/"
        assert ctx.user_agent_summary is not None
        assert ctx.user_agent_summary.platform == "iOS"
