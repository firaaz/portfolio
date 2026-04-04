"""UX protocol AG-UI transport adapter — formats UX events as SSE."""

import json
from typing import Any

from app.domain.ux import UXState


def ux_snapshot_event(state: UXState) -> str:
    """Format a UXState as an AG-UI StateSnapshot SSE event."""
    payload = {
        "type": "STATE_SNAPSHOT",
        "snapshot": state.model_dump(),
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_salience_event(items: list[dict[str, Any]]) -> str:
    """Format salience changes as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:salience", "items": items},
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_tempo_event(value: float) -> str:
    """Format tempo change as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:tempo", "value": value},
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_agency_event(value: float) -> str:
    """Format agency change as an AG-UI CustomEvent SSE event."""
    payload = {
        "type": "CUSTOM",
        "custom": {"eventType": "ux:agency", "value": value},
    }
    return f"data: {json.dumps(payload)}\n\n"
