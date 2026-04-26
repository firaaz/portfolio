"""Command route — Cmd+K runs ReadStrategy + dialogue VoiceStrategy through bus."""

import logging
import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.api.persona_events import (
    persona_delta_event,
    voice_utterance_event,
)
from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.signal_builder import build_signal_event
from app.adapters.api.ux_events import ux_snapshot_event
from app.adapters.content.yaml_loader import load_catalog
from app.adapters.sse.event_bus import SessionEventBus, get_event_bus
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.persona_evaluation import evaluate_persona
from app.domain.session import VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT as READ_SYSTEM_PROMPT
from app.domain.strategies.read import ReadStrategy
from app.domain.strategies.voice import VoiceStrategy
from app.domain.voice_evaluation import evaluate_voice

router = APIRouter(prefix="/api/agent")

_log = logging.getLogger(__name__)


class CommandRequest(BaseModel):
    """Request body for the command endpoint."""

    text: str = Field(min_length=1)
    session_id: str = Field(min_length=1)


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider

    return PydanticAIProvider()


async def _run_command_pipeline(
    context: VisitorContext,
    session_id: str,
    llm: object,
    bus: SessionEventBus,
) -> None:
    """Run Read -> dialogue Voice; publish events through the per-session bus."""
    try:
        catalog = load_catalog()
        profile = VisitorProfile(session_id=session_id, context=context)

        persona = await evaluate_persona(
            ReadStrategy(), READ_SYSTEM_PROMPT, llm, profile, catalog
        )
        if persona is None:
            return
        await bus.publish(
            session_id,
            persona_delta_event(persona, prior_trust=0.0, prior_rationale=""),
        )

        strategy = VoiceStrategy(voice_tag="dialogue")
        strategy.persona = persona
        utterances = await evaluate_voice(strategy, llm, profile, catalog)
        if utterances is None:
            return
        for utt in utterances.utterances:
            await bus.publish(session_id, voice_utterance_event(utt))
    except Exception:
        _log.exception("Background command pipeline failed for session=%s", session_id)


async def _ack_stream(context: VisitorContext) -> AsyncGenerator[str]:
    """Yield a snapshot + signal ack, then end. Real events ride the bus."""
    catalog = load_catalog()
    yield ux_snapshot_event(content_to_ux_state(catalog))
    yield build_signal_event(context)


@router.post("/command")
async def command(
    body: CommandRequest,
    background_tasks: BackgroundTasks,
    context: VisitorContext = Depends(get_visitor_context),  # noqa: B008
) -> StreamingResponse:
    """Process a visitor command; schedule pipeline; ack via short stream."""
    context.command = body.text
    llm = _get_llm_port()
    if llm is not None:
        background_tasks.add_task(
            _run_command_pipeline,
            context,
            body.session_id,
            llm,
            get_event_bus(),
        )
    return StreamingResponse(
        _ack_stream(context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
