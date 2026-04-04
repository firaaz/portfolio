"""Agent service — assembles manifest and UX state via LLM with fallback."""

import logging

from app.domain.content import ContentItem, content_to_manifest, content_to_ux_state
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest
from app.domain.ux import UXState
from app.ports.llm import LLMPort

_log = logging.getLogger(__name__)


async def assemble_manifest(
    context: VisitorContext,
    catalog: list[ContentItem],
    llm: LLMPort,
) -> Manifest:
    """Ask the LLM to score catalog items by importance. Fall back on error."""
    try:
        return await llm.assemble_manifest(context, catalog)
    except Exception:
        _log.exception("LLM failed, returning default manifest")
        return content_to_manifest(catalog)


async def assemble_ux_state(
    context: VisitorContext,
    catalog: list[ContentItem],
    llm: LLMPort,
) -> UXState:
    """Ask the LLM to build a UX state. Fall back to defaults on error."""
    try:
        return await llm.assemble_ux_state(context, catalog)
    except Exception:
        _log.exception("LLM failed, returning default UX state")
        return content_to_ux_state(catalog)
