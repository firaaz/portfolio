"""Command route — processes visitor commands via LLM and streams SSE response."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.api.ux_events import ux_salience_event, ux_snapshot_event
from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_ux_state
from app.domain.content import content_to_ux_state
from app.domain.context import VisitorContext

router = APIRouter(prefix="/api/agent")


class CommandRequest(BaseModel):
    """Request body for the command endpoint."""

    text: str = Field(min_length=1)


def _get_llm_port() -> object | None:
    """Create an LLM port if an API key is configured, else None."""
    if not os.environ.get("LLM_API_KEY"):
        return None
    from app.adapters.llm.provider import LLMProvider

    return LLMProvider()


async def _generate_command_stream(text: str) -> AsyncGenerator[str]:
    """Yield AG-UI events for a command: UX snapshot, then optional salience."""
    catalog = load_catalog()
    default_state = content_to_ux_state(catalog)
    yield ux_snapshot_event(default_state)

    llm = _get_llm_port()
    if llm is None:
        return

    context = VisitorContext(command=text)
    refined = await assemble_ux_state(context, catalog, llm)
    if refined != default_state:
        changes = [{"id": item.id, "salience": item.salience} for item in refined.items]
        yield ux_salience_event(changes)


@router.post("/command")
async def command(body: CommandRequest) -> StreamingResponse:
    """Process a visitor command and stream updated UX state."""
    return StreamingResponse(
        _generate_command_stream(body.text),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
