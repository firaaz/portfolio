"""SSE stream route — serves AG-UI StateSnapshot and optional StateDelta."""

import json
import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_manifest
from app.domain.content import content_to_manifest
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest

router = APIRouter(prefix="/api/agent")


def _state_snapshot_event(manifest: Manifest) -> str:
    """Format a manifest as an AG-UI StateSnapshot SSE event."""
    payload = {
        "type": "STATE_SNAPSHOT",
        "snapshot": {"manifest": manifest.model_dump()},
    }
    return f"data: {json.dumps(payload)}\n\n"


def _state_delta_event(refined: Manifest) -> str:
    """Format refined importance scores as an AG-UI StateDelta SSE event."""
    updates = [
        {"id": item.id, "importance": item.importance}
        for item in refined.items
    ]
    payload = {"type": "STATE_DELTA", "delta": {"updates": updates}}
    return f"data: {json.dumps(payload)}\n\n"


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.provider import LLMProvider

    return LLMProvider()


async def _generate_stream(referrer: str | None) -> AsyncGenerator[str]:
    """Yield AG-UI events: StateSnapshot immediately, StateDelta after LLM."""
    catalog = load_catalog()
    default_manifest = content_to_manifest(catalog)
    yield _state_snapshot_event(default_manifest)

    llm = _get_llm_port()
    if llm is None:
        return

    context = VisitorContext(referrer=referrer)
    refined = await assemble_manifest(context, catalog, llm)
    if refined != default_manifest:
        yield _state_delta_event(refined)


@router.get("/stream")
async def stream(request: Request) -> StreamingResponse:
    """SSE endpoint serving AG-UI events with the current manifest."""
    referrer = request.headers.get("referer")
    return StreamingResponse(
        _generate_stream(referrer),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
