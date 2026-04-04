"""LLM port — protocol for manifest and UX state assembly via language model."""

from typing import Protocol

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest
from app.domain.ux import UXState


class LLMPort(Protocol):
    """Port for assembling a manifest or UX state using an LLM."""

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest: ...

    async def assemble_ux_state(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> UXState: ...
