"""Signal route — ingests behavioral signals, fires AdaptStrategy on escalation."""

import logging
import os

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel

from app.adapters.api.ux_events import intelligence_to_events
from app.adapters.content.yaml_loader import load_catalog
from app.adapters.session.memory_session import InMemorySession
from app.adapters.sse.event_bus import SessionEventBus
from app.domain.context import VisitorContext
from app.domain.evaluation import evaluate_intelligence
from app.domain.session import SignalBatch, VisitorProfile
from app.domain.strategies.adapt import SYSTEM_PROMPT as ADAPT_SYSTEM_PROMPT
from app.domain.strategies.adapt import AdaptStrategy

router = APIRouter(prefix="/api/agent")

_log = logging.getLogger(__name__)

_session_store: InMemorySession | None = None
_event_bus: SessionEventBus | None = None


def _get_session_store() -> InMemorySession:
    """Return the module-level session store singleton."""
    global _session_store
    if _session_store is None:
        ttl = int(os.environ.get("SESSION_TTL_SECONDS", "1800"))
        capacity = int(os.environ.get("SESSION_CAPACITY", "256"))
        _session_store = InMemorySession(ttl_seconds=ttl, capacity=capacity)
    return _session_store


def _get_event_bus() -> SessionEventBus:
    """Return the module-level event bus singleton."""
    global _event_bus
    if _event_bus is None:
        _event_bus = SessionEventBus()
    return _event_bus


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None.

    Return type mirrors stream_route._get_llm_port — the concrete provider does
    not structurally satisfy the full LLMPort protocol (manifest/ux methods),
    but evaluate_intelligence only needs the evaluate() method.
    """
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider

    return PydanticAIProvider()


def _confidence_band(confidence: float) -> int:
    """Map a confidence value to a 0.1-wide band index."""
    return int(confidence * 10)


def _should_adapt(old_tier: int, old_band: int, profile: VisitorProfile) -> bool:
    """Return True when tier escalated or confidence crossed a 0.1 band."""
    return profile.tier > old_tier or _confidence_band(profile.confidence) > old_band


async def _run_adaptation(
    profile: VisitorProfile,
    bus: SessionEventBus,
    llm: object,
) -> None:
    """Run AdaptStrategy and publish resulting events to the bus.

    Wrapped in a broad except so background-task failures stay silent — agent
    silence is better than a crash. Concurrent escalations may interleave their
    publications in the bus; ordering is only guaranteed within a single call.
    """
    try:
        catalog = load_catalog()
        result = await evaluate_intelligence(
            AdaptStrategy(),
            ADAPT_SYSTEM_PROMPT,
            llm,
            profile,
            catalog,
        )
        if result is None:
            return
        for event in intelligence_to_events(result):
            await bus.publish(profile.session_id, event)
    except Exception:
        _log.exception(
            "Background adaptation failed for session=%s", profile.session_id
        )


class SignalResponse(BaseModel):
    """Response after processing signals."""

    session_id: str
    tier: int
    confidence: float
    signal_count: int


@router.post("/signal")
async def ingest_signals(
    batch: SignalBatch,
    background_tasks: BackgroundTasks,
) -> SignalResponse:
    """Process a batch of behavioral signals; schedule adaptation on escalation."""
    store = _get_session_store()
    profile = store.get(batch.session_id)

    if profile is None:
        profile = VisitorProfile(session_id=batch.session_id, context=VisitorContext())

    old_tier = profile.tier
    old_band = _confidence_band(profile.confidence)

    for signal in batch.signals:
        profile.accumulate(signal)

    store.upsert(profile)

    llm = _get_llm_port()
    if llm is not None and _should_adapt(old_tier, old_band, profile):
        background_tasks.add_task(
            _run_adaptation,
            profile.model_copy(deep=True),
            _get_event_bus(),
            llm,
        )

    return SignalResponse(
        session_id=profile.session_id,
        tier=profile.tier,
        confidence=profile.confidence,
        signal_count=len(profile.signals),
    )
