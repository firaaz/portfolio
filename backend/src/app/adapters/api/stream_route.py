"""SSE stream route — serves AG-UI UX protocol snapshot and five-verb events."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.adapters.api.dispatch import staggered_dispatch
from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.signal_builder import build_signal_event
from app.adapters.api.ux_events import intelligence_to_events, ux_snapshot_event
from app.adapters.cache.memory_cache import MemoryCache
from app.adapters.content.yaml_loader import load_catalog
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.evaluation import evaluate_intelligence
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategies.select import SYSTEM_PROMPT as SELECT_SYSTEM_PROMPT
from app.domain.strategies.select import SelectStrategy

router = APIRouter(prefix="/api/agent")

_cache_instance: MemoryCache[IntelligenceResult] | None = None


def _get_cache() -> MemoryCache[IntelligenceResult]:
    """Return the module-level cache singleton, creating it on first call."""
    global _cache_instance
    if _cache_instance is None:
        capacity = int(os.environ.get("CACHE_CAPACITY", "32"))
        _cache_instance = MemoryCache[IntelligenceResult](capacity=capacity)
    return _cache_instance


def _cache_ttl() -> int:
    """Read cache TTL from environment, defaulting to 3600 seconds."""
    return int(os.environ.get("CACHE_TTL_SECONDS", "3600"))


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider

    return PydanticAIProvider()


async def _generate_stream(context: VisitorContext) -> AsyncGenerator[str]:
    """Yield AG-UI events: snapshot, signal, then five-verb events."""
    catalog = load_catalog()
    default_state = content_to_ux_state(catalog)
    yield ux_snapshot_event(default_state)
    yield build_signal_event(context)

    llm = _get_llm_port()
    if llm is None:
        return

    cache = _get_cache()
    cached = cache.get(context.referrer_type)
    if cached is None:
        profile = VisitorProfile(session_id="anonymous", context=context)
        strategy = SelectStrategy()
        cached = await evaluate_intelligence(
            strategy,
            SELECT_SYSTEM_PROMPT,
            llm,
            profile,
            catalog,
        )
        if cached is None:
            return
        cache.set(context.referrer_type, cached, _cache_ttl())

    events = intelligence_to_events(cached)
    async for ev in staggered_dispatch(events):
        yield ev


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
