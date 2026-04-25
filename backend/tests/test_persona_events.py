"""Tests for persona_delta_event — SSE formatter for PERSONA_DELTA events."""

import json
from datetime import UTC, datetime

from app.adapters.api.persona_events import persona_delta_event
from app.domain.persona import Observation, Persona, SignalRef


def _persona(trust: float = 0.5) -> Persona:
    return Persona(
        rationale="LinkedIn visitor reading architecture",
        observations=[
            Observation(
                dimension="role",
                value="engineer",
                confidence=0.6,
                rationale="dwell on tenancy",
                source_signals=[SignalRef(kind="signal", id="s0")],
                ts=datetime(2026, 4, 26, 12, 0, 0, tzinfo=UTC),
            )
        ],
        trust=trust,
    )


class TestPersonaDeltaEvent:
    def test_emits_well_formed_sse_data_frame(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        assert ev.startswith("data: ")
        assert ev.endswith("\n\n")

    def test_payload_is_custom_event_with_eventtype_persona_delta(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        payload = json.loads(ev[len("data: ") :].strip())
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "persona:delta"

    def test_includes_added_observations_only(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.0, prior_rationale="")
        payload = json.loads(ev[len("data: ") :].strip())
        added = payload["custom"]["observations_added"]
        assert len(added) == 1
        assert added[0]["dimension"] == "role"
        assert added[0]["value"] == "engineer"

    def test_omits_rationale_when_unchanged(self) -> None:
        ev = persona_delta_event(
            _persona(),
            prior_trust=0.5,
            prior_rationale="LinkedIn visitor reading architecture",
        )
        payload = json.loads(ev[len("data: ") :].strip())
        assert "rationale" not in payload["custom"]

    def test_omits_trust_when_unchanged(self) -> None:
        ev = persona_delta_event(_persona(), prior_trust=0.5, prior_rationale="x")
        payload = json.loads(ev[len("data: ") :].strip())
        assert "trust" not in payload["custom"]

    def test_includes_trust_when_changed(self) -> None:
        ev = persona_delta_event(_persona(0.7), prior_trust=0.4, prior_rationale="x")
        payload = json.loads(ev[len("data: ") :].strip())
        assert payload["custom"]["trust"] == 0.7
