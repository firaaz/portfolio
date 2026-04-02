"""Agent service — assembles manifest via LLM with fallback to defaults."""

import logging

from app.domain.content import ContentItem, content_to_manifest
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest
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
