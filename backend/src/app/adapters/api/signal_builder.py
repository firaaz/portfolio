"""Pre-LLM ux:signal synthesizer — narrates agent intent from referrer context."""

from app.adapters.api.ux_events import ux_signal_event
from app.domain.context import VisitorContext

_REASONINGS: dict[str, tuple[str, float]] = {
    "linkedin": (
        "LinkedIn visitor — elevating leadership and business impact.",
        0.75,
    ),
    "github": (
        "GitHub visitor — elevating technical depth and projects.",
        0.72,
    ),
    "direct": (
        "Direct visitor — holding the neutral composition.",
        0.55,
    ),
    "unknown": (
        "Observing — will recompose once intent becomes clearer.",
        0.35,
    ),
}


def build_signal_event(context: VisitorContext) -> str:
    """Return an SSE ux:signal event synthesized from the referrer context."""
    reasoning, confidence = _REASONINGS.get(
        context.referrer_type, _REASONINGS["unknown"]
    )
    return ux_signal_event(confidence=confidence, reasoning=reasoning)
