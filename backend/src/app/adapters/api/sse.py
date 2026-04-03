"""Shared SSE event formatters for AG-UI protocol."""

import json

from app.domain.manifest import Manifest


def state_snapshot_event(manifest: Manifest) -> str:
    """Format a manifest as an AG-UI StateSnapshot SSE event."""
    payload = {
        "type": "STATE_SNAPSHOT",
        "snapshot": {"manifest": manifest.model_dump()},
    }
    return f"data: {json.dumps(payload)}\n\n"


def state_delta_event(refined: Manifest) -> str:
    """Format refined importance scores as an AG-UI StateDelta SSE event."""
    updates = [{"id": item.id, "importance": item.importance} for item in refined.items]
    payload = {"type": "STATE_DELTA", "delta": {"updates": updates}}
    return f"data: {json.dumps(payload)}\n\n"
