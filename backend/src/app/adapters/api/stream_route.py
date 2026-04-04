"""SSE stream route — serves AG-UI UX protocol StateSnapshot and salience events."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.ux_events import ux_salience_event, ux_snapshot_event
from app.adapters.cache.memory_cache import MemoryCache
from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_ux_state
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext

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
    """Yield AG-UI events: UX snapshot immediately, salience delta after LLM."""
    catalog = load_catalog()
    default_state = content_to_ux_state(catalog)
    yield ux_snapshot_event(default_state)

    llm = _get_llm_port()
    if llm is None:
        return

    cache = _get_cache()
    cached = cache.get(context.referrer_type)
    if cached is not None:
        if cached != default_state:
            changes = _salience_changes(default_state, cached)
            yield ux_salience_event(changes)
        return

    refined = await assemble_ux_state(context, catalog, llm)
    if refined != default_state:
        cache.set(context.referrer_type, refined, _cache_ttl())
        changes = _salience_changes(default_state, refined)
        yield ux_salience_event(changes)


def _salience_changes(default: object, refined: object) -> list[dict[str, object]]:
    """Compute salience differences between default and refined UX states."""
    return [
        {"id": item.id, "salience": item.salience}
        for item in refined.items  # type: ignore[attr-defined]
    ]


@router.get("/stream")
async def stream(
    context: VisitorContext = Depends(get_visitor_context),  # noqa: B008
) -> StreamingResponse:
    """SSE endpoint serving AG-UI UX protocol events."""
    return StreamingResponse(
        _generate_stream(context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
