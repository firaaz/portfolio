"""EDD evals — command relevancy scoring."""

import pytest

from app.domain.agent import assemble_manifest
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest


def _score(manifest: Manifest, item_id: str) -> float:
    """Extract importance score for an item by ID."""
    for item in manifest.items:
        if item.id == item_id:
            return item.importance
    msg = f"Item {item_id} not found in manifest"
    raise ValueError(msg)


@pytest.mark.eval
class TestCommandRelevancy:
    """Visitor commands should elevate relevant content items."""

    @pytest.mark.asyncio
    async def test_ai_projects_command_elevates_salama(
        self,
        llm_provider: object,
        catalog: list[ContentItem],
    ) -> None:
        """Command 'show me your AI projects' should elevate project-salama."""
        context = VisitorContext(command="show me your AI projects")
        result = await assemble_manifest(context, catalog, llm_provider)
        assert _score(result, "project-salama") > 0.7

    @pytest.mark.asyncio
    async def test_contact_command_elevates_contact(
        self,
        llm_provider: object,
        catalog: list[ContentItem],
    ) -> None:
        """Command 'how can I reach you' should elevate contact."""
        context = VisitorContext(command="how can I reach you")
        result = await assemble_manifest(context, catalog, llm_provider)
        assert _score(result, "contact") > 0.7
