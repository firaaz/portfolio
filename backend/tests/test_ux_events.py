"""Tests for UX protocol AG-UI transport adapter."""

import json

from app.adapters.api.ux_events import (
    ux_agency_event,
    ux_salience_event,
    ux_snapshot_event,
    ux_tempo_event,
)
from app.domain.ux import UXGlobals, UXItem, UXState


class TestUXSnapshotEvent:
    """UX snapshot event wraps full state as AG-UI StateSnapshot."""

    def test_format(self) -> None:
        state = UXState(
            ux=UXGlobals(tempo=0.3, agency=0.7),
            items=[
                UXItem(
                    id="hero",
                    salience=0.95,
                    group="identity",
                    molecule="hero",
                    data={"name": "F"},
                ),
            ],
        )
        raw = ux_snapshot_event(state)
        assert raw.startswith("data: ")
        assert raw.endswith("\n\n")
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "STATE_SNAPSHOT"
        assert payload["snapshot"]["ux"]["tempo"] == 0.3
        assert payload["snapshot"]["ux"]["agency"] == 0.7
        assert payload["snapshot"]["items"][0]["salience"] == 0.95
        assert payload["snapshot"]["items"][0]["group"] == "identity"


class TestUXSalienceEvent:
    """UX salience event sends item weight changes as AG-UI CustomEvent."""

    def test_format(self) -> None:
        raw = ux_salience_event([{"id": "hero", "salience": 0.9}])
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:salience"
        assert payload["custom"]["items"][0]["salience"] == 0.9


class TestUXTempoEvent:
    """UX tempo event sends rate-of-change shift as AG-UI CustomEvent."""

    def test_format(self) -> None:
        raw = ux_tempo_event(0.7)
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:tempo"
        assert payload["custom"]["value"] == 0.7


class TestUXAgencyEvent:
    """UX agency event sends control-balance shift as AG-UI CustomEvent."""

    def test_format(self) -> None:
        raw = ux_agency_event(0.8)
        payload = json.loads(raw[6:-2])
        assert payload["type"] == "CUSTOM"
        assert payload["custom"]["eventType"] == "ux:agency"
        assert payload["custom"]["value"] == 0.8
