"""Referrer dependency — extracts visitor context from HTTP request."""

from fastapi import Request

from app.domain.context import VisitorContext


async def get_visitor_context(request: Request) -> VisitorContext:
    """Build VisitorContext from Referer header and UTM query params."""
    referrer = request.headers.get("referer")
    return VisitorContext(
        referrer=referrer,
        utm_source=request.query_params.get("utm_source"),
        utm_medium=request.query_params.get("utm_medium"),
        utm_campaign=request.query_params.get("utm_campaign"),
    )
