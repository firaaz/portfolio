"""Tests for VisitorContext model — referrer URL parsing."""

from app.domain.context import VisitorContext


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
