"""LLM port — protocol for manifest assembly via language model."""

from typing import Protocol

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest


class LLMPort(Protocol):
    """Port for assembling a manifest using an LLM."""

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest: ...
