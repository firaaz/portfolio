"""SSE stream route — serves AG-UI StateSnapshot and optional StateDelta."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.sse import decision_event, state_delta_event, state_snapshot_event
from app.adapters.cache.memory_cache import MemoryCache
from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_manifest
from app.domain.content import content_to_manifest
from app.domain.context import VisitorContext
from app.domain.decision import build_decision

router = APIRouter(prefix="/api/agent")

_cache_instance: MemoryCache | None = None


def _get_cache() -> MemoryCache:
    """Return the module-level cache singleton, creating it on first call."""
    global _cache_instance
    if _cache_instance is None:
        capacity = int(os.environ.get("CACHE_CAPACITY", "32"))
        _cache_instance = MemoryCache(capacity=capacity)
    return _cache_instance


def _cache_ttl() -> int:
    """Read cache TTL from environment, defaulting to 3600 seconds."""
    return int(os.environ.get("CACHE_TTL_SECONDS", "3600"))


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.provider import LLMProvider

    return LLMProvider()


async def _generate_stream(context: VisitorContext) -> AsyncGenerator[str]:
    """Yield AG-UI events: StateSnapshot immediately, StateDelta after LLM."""
    catalog = load_catalog()
    default_manifest = content_to_manifest(catalog)
    yield state_snapshot_event(default_manifest)

    llm = _get_llm_port()
    if llm is None:
        return

    cache = _get_cache()
    cached = cache.get(context.referrer_type)
    if cached is not None:
        if cached != default_manifest:
            yield state_delta_event(cached)
        return

    refined = await assemble_manifest(context, catalog, llm)
    if refined != default_manifest:
        cache.set(context.referrer_type, refined, _cache_ttl())
        record = build_decision(
            default=default_manifest,
            refined=refined,
            referrer_type=context.referrer_type,
            command=context.command,
        )
        yield decision_event(record)
        yield state_delta_event(refined)


@router.get("/stream")
async def stream(
    context: VisitorContext = Depends(get_visitor_context),  # noqa: B008
) -> StreamingResponse:
    """SSE endpoint serving AG-UI events with the current manifest."""
    return StreamingResponse(
        _generate_stream(context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
