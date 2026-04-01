"""SSE stream route — serves AG-UI StateSnapshot from content catalog."""

import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.adapters.content.yaml_loader import load_catalog
from app.domain.content import content_to_manifest
from app.domain.manifest import Manifest

router = APIRouter(prefix="/api/agent")


def _state_snapshot_event(manifest: Manifest) -> str:
    """Format a manifest as an AG-UI StateSnapshot SSE event."""
    payload = {
        "type": "STATE_SNAPSHOT",
        "snapshot": manifest.model_dump(),
    }
    return f"data: {json.dumps(payload)}\n\n"


async def _generate_stream() -> AsyncGenerator[str]:
    """Yield AG-UI events as SSE."""
    catalog = load_catalog()
    manifest = content_to_manifest(catalog)
    yield _state_snapshot_event(manifest)


@router.get("/stream")
async def stream() -> StreamingResponse:
    """SSE endpoint serving AG-UI events with the current manifest."""
    return StreamingResponse(
        _generate_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
