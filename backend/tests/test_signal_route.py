"""Tests for the behavioral signal ingestion endpoint."""

import asyncio
from typing import Any
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.adapters.sse.event_bus import SessionEventBus
from app.domain.context import VisitorContext
from app.domain.intelligence import IntelligenceResult, ItemResult
from app.domain.session import BehavioralSignal, VisitorProfile
from app.main import app

client = TestClient(app)


def _signal(card_id: str = "skills", duration_ms: int = 1500, ts: float = 1.0) -> dict:
    return {
        "type": "dwell",
        "card_id": card_id,
        "duration_ms": duration_ms,
        "timestamp": ts,
    }


class TestSignalRoute:
    def test_post_signals_returns_200(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session",
                "signals": [
                    {
                        "type": "dwell",
                        "card_id": "skills",
                        "duration_ms": 3000,
                        "timestamp": 1.0,
                    }
                ],
            },
        )
        assert response.status_code == 200

    def test_post_signals_returns_profile_summary(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session-2",
                "signals": [
                    {
                        "type": "dwell",
                        "card_id": "featured",
                        "duration_ms": 5000,
                        "timestamp": 1.0,
                    },
                    {
                        "type": "click",
                        "card_id": "featured",
                        "duration_ms": 0,
                        "timestamp": 2.0,
                    },
                ],
            },
        )
        data = response.json()
        assert "session_id" in data
        assert "tier" in data
        assert "confidence" in data

    def test_rejects_invalid_signal_type(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "s",
                "signals": [
                    {"type": "scroll", "card_id": "x", "duration_ms": 0, "timestamp": 0}
                ],
            },
        )
        assert response.status_code == 422

    def test_empty_signals_accepted(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={"session_id": "s", "signals": []},
        )
        assert response.status_code == 200


class TestSignalRouteAdaptation:
    """Adaptation orchestration on tier or confidence-band escalation."""

    def test_no_adaptation_when_signals_empty(self) -> None:
        # Empty batch = no escalation path; LLM port is also auto-mocked to None.
        with patch(
            "app.adapters.api.signal_route._run_adaptation",
            new_callable=AsyncMock,
        ) as mock_run:
            response = client.post(
                "/api/agent/signal",
                json={"session_id": "empty-batch", "signals": []},
            )
        assert response.status_code == 200
        mock_run.assert_not_called()

    def test_no_adaptation_when_llm_port_unavailable(self) -> None:
        # conftest auto-patches signal_route._get_llm_port to None — so escalation
        # detection should still fire but adaptation must be skipped.
        with patch(
            "app.adapters.api.signal_route._run_adaptation",
            new_callable=AsyncMock,
        ) as mock_run:
            response = client.post(
                "/api/agent/signal",
                json={
                    "session_id": "no-llm",
                    "signals": [_signal()],
                },
            )
        assert response.status_code == 200
        mock_run.assert_not_called()

    def test_adaptation_fires_on_first_signal_band_crossing(self) -> None:
        # First signal: confidence 0 -> 0.12, band 0 -> 1, tier stays 1.
        # Band crossing should trigger adaptation when LLM is available.
        with (
            patch(
                "app.adapters.api.signal_route._get_llm_port",
                return_value=object(),
            ),
            patch(
                "app.adapters.api.signal_route._run_adaptation",
                new_callable=AsyncMock,
            ) as mock_run,
        ):
            response = client.post(
                "/api/agent/signal",
                json={"session_id": "fresh-band", "signals": [_signal()]},
            )
        assert response.status_code == 200
        mock_run.assert_called_once()

    def test_adaptation_fires_on_tier_jump_to_2(self) -> None:
        # 3 signals push tier 1 -> 2 (and bands cross).
        with (
            patch(
                "app.adapters.api.signal_route._get_llm_port",
                return_value=object(),
            ),
            patch(
                "app.adapters.api.signal_route._run_adaptation",
                new_callable=AsyncMock,
            ) as mock_run,
        ):
            response = client.post(
                "/api/agent/signal",
                json={
                    "session_id": "tier-2-jump",
                    "signals": [_signal(ts=1.0), _signal(ts=2.0), _signal(ts=3.0)],
                },
            )
        assert response.status_code == 200
        assert response.json()["tier"] == 2
        mock_run.assert_called_once()

    def test_adaptation_fires_on_tier_jump_to_3(self) -> None:
        # 6 signals: confidence reaches 0.72 -> tier 3.
        signals = [_signal(ts=float(i)) for i in range(6)]
        with (
            patch(
                "app.adapters.api.signal_route._get_llm_port",
                return_value=object(),
            ),
            patch(
                "app.adapters.api.signal_route._run_adaptation",
                new_callable=AsyncMock,
            ) as mock_run,
        ):
            response = client.post(
                "/api/agent/signal",
                json={"session_id": "tier-3-jump", "signals": signals},
            )
        assert response.status_code == 200
        assert response.json()["tier"] == 3
        mock_run.assert_called_once()

    async def test_run_adaptation_publishes_events_to_bus(self) -> None:
        from app.adapters.api.signal_route import _run_adaptation

        profile = VisitorProfile(session_id="direct", context=VisitorContext())
        for _ in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=1500, timestamp=1.0
                )
            )

        result = IntelligenceResult(
            items=[
                ItemResult(id="hero", importance=0.95, emphasis=["title"]),
                ItemResult(id="skills", importance=0.7, emphasis=["highlights"]),
                ItemResult(id="featured", importance=0.2),
            ],
            bridges=None,
        )

        async def _fake_evaluate(*_args: Any, **_kwargs: Any) -> IntelligenceResult:
            return result

        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe(profile.session_id):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer_task = asyncio.create_task(_consumer())
        await asyncio.sleep(0)
        # Mock both: evaluate_persona returns None so the persona branch is a no-op
        # and the consumer sees only intelligence events (preserving prior contract).
        with (
            patch(
                "app.adapters.api.signal_route.evaluate_intelligence",
                new=_fake_evaluate,
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_persona",
                new=AsyncMock(return_value=None),
            ),
        ):
            await _run_adaptation(profile, bus, AsyncMock())
        await asyncio.wait_for(consumer_task, timeout=1.0)
        # 1 recede (0.2 <= 0.3) + 2 focuses (>=0.6) = 3 events; consumer broke at 2.
        assert len(received) == 2
        assert all(ev.startswith("data: ") for ev in received)


class TestSignalRoutePersonaEmission:
    """ReadStrategy fires alongside AdaptStrategy; emits PERSONA_DELTA via the bus."""

    async def test_run_adaptation_publishes_persona_delta_then_intelligence_events(
        self,
    ) -> None:
        from datetime import UTC, datetime

        from app.adapters.api.signal_route import _run_adaptation
        from app.domain.persona import Observation, Persona, SignalRef

        profile = VisitorProfile(session_id="persona-emit", context=VisitorContext())
        for _ in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=1500, timestamp=1.0
                )
            )

        persona = Persona(
            rationale="testing emission",
            observations=[
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.6,
                    rationale="dwell pattern",
                    source_signals=[SignalRef(kind="signal", id="s0")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.5,
        )
        intelligence = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.95)],
            bridges=None,
        )

        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe(profile.session_id):
                received.append(event)
                if len(received) >= 2:
                    break

        consumer_task = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch(
                "app.adapters.api.signal_route.evaluate_persona",
                new=AsyncMock(return_value=persona),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_intelligence",
                new=AsyncMock(return_value=intelligence),
            ),
        ):
            await _run_adaptation(profile, bus, AsyncMock())

        await asyncio.wait_for(consumer_task, timeout=1.0)
        # First event should be the persona delta, then intelligence events.
        assert len(received) >= 1
        assert "persona:delta" in received[0]


class TestSignalRouteVoiceEmission:
    """Whisper voice fires after PERSONA_DELTA when trust < 0.4."""

    async def test_run_adaptation_emits_voice_utterance_after_persona_delta(
        self,
    ) -> None:
        from datetime import UTC, datetime

        from app.adapters.api.signal_route import _run_adaptation
        from app.domain.persona import Observation, Persona, SignalRef
        from app.domain.strategies.voice import VoiceUtterance, VoiceUtteranceList

        profile = VisitorProfile(session_id="voice-emit", context=VisitorContext())
        for _ in range(3):
            profile.accumulate(
                BehavioralSignal(
                    type="dwell", card_id="skills", duration_ms=1500, timestamp=1.0
                )
            )

        # trust=0.2 -> select_voice returns "whisper" (registered in VOICE_PROMPTS)
        low_trust_persona = Persona(
            rationale="early-read",
            observations=[
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.4,
                    rationale="dwell pattern",
                    source_signals=[SignalRef(kind="signal", id="s0")],
                    ts=datetime.now(UTC),
                )
            ],
            trust=0.2,
        )
        utterances = VoiceUtteranceList(
            utterances=[
                VoiceUtterance(
                    voice_tag="whisper",
                    utterance_kind="observation",
                    content="reading slowly here",
                )
            ]
        )
        intelligence = IntelligenceResult(
            items=[ItemResult(id="hero", importance=0.95)],
            bridges=None,
        )

        bus = SessionEventBus()
        received: list[str] = []

        async def _consumer() -> None:
            async for event in bus.subscribe(profile.session_id):
                received.append(event)
                if len(received) >= 3:
                    break

        consumer_task = asyncio.create_task(_consumer())
        await asyncio.sleep(0)

        with (
            patch(
                "app.adapters.api.signal_route.evaluate_persona",
                new=AsyncMock(return_value=low_trust_persona),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_voice",
                new=AsyncMock(return_value=utterances),
            ),
            patch(
                "app.adapters.api.signal_route.evaluate_intelligence",
                new=AsyncMock(return_value=intelligence),
            ),
        ):
            await _run_adaptation(profile, bus, AsyncMock())

        await asyncio.wait_for(consumer_task, timeout=1.0)
        # Order: persona:delta -> voice:utterance -> intelligence (UX) event.
        assert len(received) >= 2
        assert "persona:delta" in received[0]
        assert "voice:utterance" in received[1]


class TestSignalRouteInitialContext:
    """First-paint context (viewport, landing_path, UA summary) lifts onto profile."""

    def test_first_batch_persists_initial_context(self) -> None:
        from app.adapters.api.signal_route import _get_session_store

        sid = "ic-first-batch"
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": sid,
                "signals": [_signal()],
                "viewport": {
                    "width": 390,
                    "height": 844,
                    "pointer_type": "touch",
                    "prefers_reduced_motion": True,
                },
                "landing_path": "/work",
                "user_agent_summary": {"family": "Safari", "platform": "iOS"},
            },
        )
        assert response.status_code == 200

        profile = _get_session_store().get(sid)
        assert profile is not None
        assert profile.context.viewport is not None
        assert profile.context.viewport.width == 390
        assert profile.context.viewport.pointer_type == "touch"
        assert profile.context.viewport.prefers_reduced_motion is True
        assert profile.context.landing_path == "/work"
        assert profile.context.user_agent_summary is not None
        assert profile.context.user_agent_summary.family == "Safari"
        assert profile.context.user_agent_summary.platform == "iOS"

    def test_initial_context_optional_for_subsequent_batches(self) -> None:
        sid = "ic-no-second"
        client.post(
            "/api/agent/signal",
            json={
                "session_id": sid,
                "signals": [_signal()],
                "viewport": {"width": 1440, "height": 900, "pointer_type": "mouse"},
            },
        )
        # Second batch omits initial_context — must still succeed.
        response = client.post(
            "/api/agent/signal",
            json={"session_id": sid, "signals": [_signal(ts=2.0)]},
        )
        assert response.status_code == 200

    def test_subsequent_batch_does_not_clobber_initial_context(self) -> None:
        from app.adapters.api.signal_route import _get_session_store

        sid = "ic-no-clobber"
        client.post(
            "/api/agent/signal",
            json={
                "session_id": sid,
                "signals": [_signal()],
                "viewport": {"width": 1440, "height": 900, "pointer_type": "mouse"},
                "landing_path": "/",
            },
        )
        client.post(
            "/api/agent/signal",
            json={
                "session_id": sid,
                "signals": [_signal(ts=2.0)],
                "viewport": {"width": 320, "height": 568, "pointer_type": "touch"},
                "landing_path": "/should-not-overwrite",
            },
        )
        profile = _get_session_store().get(sid)
        assert profile is not None
        assert profile.context.viewport is not None
        assert profile.context.viewport.width == 1440
        assert profile.context.viewport.pointer_type == "mouse"
        assert profile.context.landing_path == "/"
