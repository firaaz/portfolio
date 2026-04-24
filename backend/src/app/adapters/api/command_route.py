"""Command route — processes visitor commands via ComposeStrategy and streams SSE."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.api.dispatch import staggered_dispatch
from app.adapters.api.referrer import get_visitor_context
from app.adapters.api.signal_builder import build_signal_event
from app.adapters.api.ux_events import intelligence_to_events, ux_snapshot_event
from app.adapters.content.yaml_loader import load_catalog
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.evaluation import evaluate_intelligence
from app.domain.session import VisitorProfile
from app.domain.strategies.compose import SYSTEM_PROMPT as COMPOSE_SYSTEM_PROMPT
from app.domain.strategies.compose import ComposeStrategy

router = APIRouter(prefix="/api/agent")


class CommandRequest(BaseModel):
    """Request body for the command endpoint."""

    text: str = Field(min_length=1)


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider

    return PydanticAIProvider()


async def _generate_command_stream(
    context: VisitorContext,
) -> AsyncGenerator[str]:
    """Yield AG-UI events: snapshot, signal, then five-verb events."""
    catalog = load_catalog()
    default_state = content_to_ux_state(catalog)
    yield ux_snapshot_event(default_state)
    yield build_signal_event(context)

    llm = _get_llm_port()
    if llm is None:
        return

    profile = VisitorProfile(session_id="anonymous", context=context)
    strategy = ComposeStrategy()
    result = await evaluate_intelligence(
        strategy,
        COMPOSE_SYSTEM_PROMPT,
        llm,
        profile,
        catalog,
    )
    if result is None:
        return

    events = intelligence_to_events(result)
    async for ev in staggered_dispatch(events):
        yield ev


@router.post("/command")
async def command(
    body: CommandRequest,
    context: VisitorContext = Depends(get_visitor_context),  # noqa: B008
) -> StreamingResponse:
    """Process a visitor command and stream five-verb UX events."""
    context.command = body.text
    return StreamingResponse(
        _generate_command_stream(context),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
