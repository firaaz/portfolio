"""UX protocol AG-UI transport adapter — formats UX events as SSE."""

import json
from typing import Any

from app.domain.intelligence import IntelligenceResult
from app.domain.ux import UXState

_FOCUS_MIN = 0.6
_RECEDE_MAX = 0.3


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


def ux_focus_event(item_id: str, importance: float, emphasis: list[str]) -> str:
    """Format a FOCUS verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:focus",
            "item_id": item_id,
            "importance": importance,
            "emphasis": emphasis,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_recede_event(item_id: str, importance: float) -> str:
    """Format a RECEDE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:recede",
            "item_id": item_id,
            "importance": importance,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_bridge_event(source_id: str, target_id: str, text: str) -> str:
    """Format a BRIDGE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:bridge",
            "source_id": source_id,
            "target_id": target_id,
            "text": text,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_surface_event(item_id: str, generated: dict[str, str]) -> str:
    """Format a SURFACE verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:surface",
            "item_id": item_id,
            "generated": generated,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def ux_signal_event(confidence: float, reasoning: str) -> str:
    """Format a SIGNAL verb as AG-UI CustomEvent."""
    payload = {
        "type": "CUSTOM",
        "custom": {
            "eventType": "ux:signal",
            "confidence": confidence,
            "reasoning": reasoning,
        },
    }
    return f"data: {json.dumps(payload)}\n\n"


def intelligence_to_events(result: IntelligenceResult) -> list[str]:
    """Transform IntelligenceResult into ordered SSE event strings.

    Order: recedes -> focuses -> bridges -> surfaces.
    Declutter first (low-importance items shrink), then spotlight, then
    narrative bridges, then generated copy surfaces.
    """
    recedes = [
        ux_recede_event(it.id, it.importance)
        for it in result.items
        if it.importance <= _RECEDE_MAX
    ]
    focuses = [
        ux_focus_event(it.id, it.importance, it.emphasis or [])
        for it in result.items
        if it.importance >= _FOCUS_MIN
    ]
    bridges = [
        ux_bridge_event(b.source_id, b.target_id, b.text)
        for b in (result.bridges or [])
    ]
    surfaces = [
        ux_surface_event(it.id, it.generated) for it in result.items if it.generated
    ]
    return recedes + focuses + bridges + surfaces
