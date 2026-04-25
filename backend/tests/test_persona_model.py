"""Tests for Persona/Observation/SignalRef domain models."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from app.domain.persona import Observation, Persona, SignalRef


class TestSignalRef:
    def test_kind_must_be_known(self) -> None:
        SignalRef(kind="signal", id="abc")
        SignalRef(kind="observation", id="abc")
        SignalRef(kind="item", id="abc")
        with pytest.raises(ValidationError):
            SignalRef(kind="unknown", id="abc")  # type: ignore[arg-type]


class TestObservation:
    def _now(self) -> datetime:
        return datetime.now(UTC)

    def test_open_dimension_accepts_arbitrary_string(self) -> None:
        obs = Observation(
            dimension="role",
            value="recruiter",
            confidence=0.4,
            rationale="LinkedIn referrer",
            source_signals=[SignalRef(kind="signal", id="s1")],
            ts=self._now(),
        )
        assert obs.dimension == "role"

        novel = Observation(
            dimension="tonal-pref",
            value="terse",
            confidence=0.5,
            rationale="short dwells, fast clicks",
            source_signals=[SignalRef(kind="signal", id="s2")],
            ts=self._now(),
        )
        assert novel.dimension == "tonal-pref"

    def test_confidence_must_be_in_range(self) -> None:
        with pytest.raises(ValidationError):
            Observation(
                dimension="role",
                value="x",
                confidence=1.5,
                rationale="r",
                source_signals=[SignalRef(kind="signal", id="s1")],
                ts=self._now(),
            )

    def test_source_signals_must_be_non_empty(self) -> None:
        with pytest.raises(ValidationError):
            Observation(
                dimension="role",
                value="x",
                confidence=0.5,
                rationale="r",
                source_signals=[],
                ts=self._now(),
            )


class TestPersona:
    def test_empty_persona_has_zero_trust_and_empty_observations(self) -> None:
        p = Persona(rationale="no signals yet", observations=[], trust=0.0)
        assert p.trust == 0.0
        assert p.observations == []

    def test_trust_is_clamped_zero_to_one(self) -> None:
        with pytest.raises(ValidationError):
            Persona(rationale="r", observations=[], trust=1.5)
        with pytest.raises(ValidationError):
            Persona(rationale="r", observations=[], trust=-0.1)

    def test_multiple_observations_can_share_a_dimension(self) -> None:
        ts = datetime.now(UTC)
        ref = [SignalRef(kind="signal", id="s1")]
        p = Persona(
            rationale="multivoice",
            observations=[
                Observation(
                    dimension="role",
                    value="recruiter",
                    confidence=0.4,
                    rationale="linkedin",
                    source_signals=ref,
                    ts=ts,
                ),
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.6,
                    rationale="dwell on architecture",
                    source_signals=ref,
                    ts=ts,
                ),
            ],
            trust=0.5,
        )
        roles = [o for o in p.observations if o.dimension == "role"]
        assert len(roles) == 2
        assert {o.value for o in roles} == {"recruiter", "engineer"}
