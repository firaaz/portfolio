"""LLM port — protocol for manifest, UX state, and strategy evaluation."""

from typing import Protocol

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest
from app.domain.ux import UXState


class LLMPort(Protocol):
    """Port for LLM-based intelligence evaluation."""

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

    async def evaluate(
        self,
        strategy_name: str,
        system_prompt: str,
        user_prompt: str,
        result_type: type[BaseModel],
        temperature: float,
        max_tokens: int,
    ) -> BaseModel: ...
