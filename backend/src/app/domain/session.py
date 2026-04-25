"""Behavioral signal and visitor profile models — session-lived state."""

from typing import Literal

from pydantic import BaseModel, Field

from app.domain.context import VisitorContext

_TIER2_MIN_SIGNALS = 3
_TIER3_CONFIDENCE = 0.7
_CONFIDENCE_PER_SIGNAL = 0.12  # ~6 signals to reach 0.7


class BehavioralSignal(BaseModel):
    """A single behavioral event from the frontend."""

    type: Literal["dwell", "skip", "click", "hover"]
    card_id: str
    duration_ms: int = Field(ge=0)
    timestamp: float


class SignalBatch(BaseModel):
    """A batch of signals sent from the frontend."""

    session_id: str
    signals: list[BehavioralSignal]


class VisitorProfile(BaseModel):
    """Accumulated visitor state within a session."""

    session_id: str
    context: VisitorContext
    signals: list[BehavioralSignal] = Field(default_factory=list)
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    tier: int = Field(default=1, ge=1, le=3)
    dwell_map: dict[str, float] = Field(default_factory=dict)
    interests: list[str] = Field(default_factory=list)

    def accumulate(self, signal: BehavioralSignal) -> None:
        """Add a signal and update derived state."""
        self.signals.append(signal)
        if signal.type == "dwell":
            seconds = signal.duration_ms / 1000.0
            self.dwell_map[signal.card_id] = self.dwell_map.get(signal.card_id, 0.0) + seconds
        self.confidence = min(1.0, len(self.signals) * _CONFIDENCE_PER_SIGNAL)
        self._update_tier()
        self._infer_interests()

    def _update_tier(self) -> None:
        """Escalate tier based on signal count and confidence."""
        if len(self.signals) >= _TIER2_MIN_SIGNALS:
            self.tier = max(self.tier, 2)
        if self.confidence >= _TIER3_CONFIDENCE:
            self.tier = 3

    def _infer_interests(self) -> None:
        """Derive interest tags from behavioral signals."""
        # TODO: re-derive from card_id keys once AdaptStrategy invocation slice
        # owns the catalog→interest mapping. Pre-bento map keyed off legacy
        # zone names was silently producing [] post-bento; better to be
        # explicit about emptiness than to fake a derivation.
        self.interests = []
