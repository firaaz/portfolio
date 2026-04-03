"""Unit tests for referrer dependency — Referer header and UTM extraction."""

from starlette.testclient import TestClient

from app.adapters.api.referrer import get_visitor_context
from app.domain.context import VisitorContext
from app.main import app

# Wire up a test-only route that returns the extracted context as JSON.
from fastapi import Depends

_test_router_installed = False


def _install_test_route() -> None:
    """Add a /test/context endpoint that exposes get_visitor_context."""
    global _test_router_installed  # noqa: PLW0603
    if _test_router_installed:
        return
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/test/context")
    async def _ctx(
        ctx: VisitorContext = Depends(get_visitor_context),
    ) -> dict:
        return ctx.model_dump()

    app.include_router(router)
    _test_router_installed = True


_install_test_route()
client = TestClient(app)


class TestGetVisitorContext:
    """get_visitor_context extracts Referer header and UTM params."""

    def test_extracts_referer_header(self) -> None:
        """Raw Referer header is stored in context."""
        resp = client.get(
            "/test/context",
            headers={"referer": "https://example.com"},
        )
        assert resp.json()["referrer"] == "https://example.com"

    def test_linkedin_referer_sets_type_linkedin(self) -> None:
        """LinkedIn referrer maps to 'linkedin' type."""
        resp = client.get(
            "/test/context",
            headers={"referer": "https://www.linkedin.com/in/someone"},
        )
        assert resp.json()["referrer_type"] == "linkedin"

    def test_github_referer_sets_type_github(self) -> None:
        """GitHub referrer maps to 'github' type."""
        resp = client.get(
            "/test/context",
            headers={"referer": "https://github.com/user/repo"},
        )
        assert resp.json()["referrer_type"] == "github"

    def test_missing_referer_sets_type_direct(self) -> None:
        """No Referer header results in 'direct' type."""
        resp = client.get("/test/context")
        assert resp.json()["referrer_type"] == "direct"

    def test_extracts_utm_source_from_query(self) -> None:
        """utm_source query parameter is captured."""
        resp = client.get("/test/context?utm_source=newsletter")
        assert resp.json()["utm_source"] == "newsletter"

    def test_extracts_utm_medium_from_query(self) -> None:
        """utm_medium query parameter is captured."""
        resp = client.get("/test/context?utm_medium=email")
        assert resp.json()["utm_medium"] == "email"

    def test_extracts_utm_campaign_from_query(self) -> None:
        """utm_campaign query parameter is captured."""
        resp = client.get("/test/context?utm_campaign=spring2025")
        assert resp.json()["utm_campaign"] == "spring2025"

    def test_missing_utm_returns_none_fields(self) -> None:
        """UTM fields default to None when absent."""
        resp = client.get("/test/context")
        data = resp.json()
        assert data["utm_source"] is None
        assert data["utm_medium"] is None
        assert data["utm_campaign"] is None
