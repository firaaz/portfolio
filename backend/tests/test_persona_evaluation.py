"""Tests for evaluate_persona orchestrator — calls LLM, validates Persona output."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

from app.domain.context import VisitorContext
from app.domain.persona import Observation, Persona, SignalRef
from app.domain.persona_evaluation import evaluate_persona
from app.domain.session import VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT, ReadStrategy


def _profile() -> VisitorProfile:
    return VisitorProfile(session_id="s", context=VisitorContext())


def _persona() -> Persona:
    return Persona(
        rationale="LinkedIn visitor reading architecture",
        observations=[
            Observation(
                dimension="role",
                value="engineer",
                confidence=0.6,
                rationale="dwell on tenancy",
                source_signals=[SignalRef(kind="signal", id="s0")],
                ts=datetime.now(UTC),
            )
        ],
        trust=0.5,
    )


class TestEvaluatePersona:
    async def test_returns_persona_when_llm_succeeds(self) -> None:
        llm = AsyncMock()
        llm.evaluate.return_value = _persona()
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert isinstance(result, Persona)
        assert result.trust == 0.5

    async def test_returns_none_on_llm_exception(self) -> None:
        llm = AsyncMock()
        llm.evaluate.side_effect = RuntimeError("boom")
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert result is None

    async def test_returns_none_when_llm_returns_wrong_type(self) -> None:
        class NotAPersona:
            pass

        async def _wrong(*_args: Any, **_kwargs: Any) -> Any:
            return NotAPersona()

        llm = AsyncMock()
        llm.evaluate = _wrong
        result = await evaluate_persona(
            ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), []
        )
        assert result is None

    async def test_calls_llm_evaluate_with_strategy_config(self) -> None:
        llm = AsyncMock()
        llm.evaluate.return_value = _persona()
        await evaluate_persona(ReadStrategy(), SYSTEM_PROMPT, llm, _profile(), [])
        llm.evaluate.assert_awaited_once()
        kwargs = llm.evaluate.await_args.kwargs
        assert kwargs["strategy_name"] == "read"
        assert kwargs["result_type"] is Persona
        assert kwargs["system_prompt"] == SYSTEM_PROMPT
        assert 0.0 <= kwargs["temperature"] <= 1.0
        assert kwargs["max_tokens"] == 1024
        assert "Visitor referrer:" in kwargs["user_prompt"]
