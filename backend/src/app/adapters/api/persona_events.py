"""Persona protocol AG-UI transport adapter — formats PERSONA_DELTA as SSE."""

import json
from typing import Any

from app.domain.persona import Persona


def persona_delta_event(
    persona: Persona,
    prior_trust: float,
    prior_rationale: str,
) -> str:
    """Format a PERSONA_DELTA as an AG-UI CustomEvent SSE event."""
    custom: dict[str, Any] = {
        "eventType": "persona:delta",
        "observations_added": [
            obs.model_dump(mode="json") for obs in persona.observations
        ],
        "ts": persona.observations[-1].ts.isoformat() if persona.observations else None,
    }
    if persona.rationale != prior_rationale:
        custom["rationale"] = persona.rationale
    if persona.trust != prior_trust:
        custom["trust"] = persona.trust

    payload = {"type": "CUSTOM", "custom": custom}
    return f"data: {json.dumps(payload)}\n\n"
