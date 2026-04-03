"""Command route — processes visitor commands via LLM and streams SSE response."""

import os
from collections.abc import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.api.sse import decision_event, state_delta_event, state_snapshot_event
from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_manifest
from app.domain.content import content_to_manifest
from app.domain.context import VisitorContext
from app.domain.decision import build_decision

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
    """Yield AG-UI events for a command: snapshot, then optional delta."""
    catalog = load_catalog()
    default_manifest = content_to_manifest(catalog)
    yield state_snapshot_event(default_manifest)

    llm = _get_llm_port()
    if llm is None:
        return

    context = VisitorContext(command=text)
    refined = await assemble_manifest(context, catalog, llm)
    if refined != default_manifest:
        record = build_decision(
            default=default_manifest,
            refined=refined,
            referrer_type=context.referrer_type,
            command=text,
        )
        yield decision_event(record)
        yield state_delta_event(refined)


@router.post("/command")
async def command(body: CommandRequest) -> StreamingResponse:
    """Process a visitor command and stream updated manifest."""
    return StreamingResponse(
        _generate_command_stream(body.text),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
