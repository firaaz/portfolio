"""Signal route — ingests behavioral signals and updates visitor profiles."""

import os

from fastapi import APIRouter
from pydantic import BaseModel

from app.adapters.session.memory_session import InMemorySession
from app.domain.context import VisitorContext
from app.domain.session import SignalBatch, VisitorProfile

router = APIRouter(prefix="/api/agent")

_session_store: InMemorySession | None = None


def _get_session_store() -> InMemorySession:
    """Return the module-level session store singleton."""
    global _session_store
    if _session_store is None:
        ttl = int(os.environ.get("SESSION_TTL_SECONDS", "1800"))
        capacity = int(os.environ.get("SESSION_CAPACITY", "256"))
        _session_store = InMemorySession(ttl_seconds=ttl, capacity=capacity)
    return _session_store


class SignalResponse(BaseModel):
    """Response after processing signals."""

    session_id: str
    tier: int
    confidence: float
    signal_count: int


@router.post("/signal")
async def ingest_signals(batch: SignalBatch) -> SignalResponse:
    """Process a batch of behavioral signals and return updated profile state."""
    store = _get_session_store()
    profile = store.get(batch.session_id)

    if profile is None:
        profile = VisitorProfile(
            session_id=batch.session_id,
            context=VisitorContext(),
        )

    for signal in batch.signals:
        profile.accumulate(signal)

    store.upsert(profile)

    return SignalResponse(
        session_id=profile.session_id,
        tier=profile.tier,
        confidence=profile.confidence,
        signal_count=len(profile.signals),
    )
