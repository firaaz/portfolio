"""EDD: LLM must adapt importance scores based on visitor context."""

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
class TestManifestRelevancy:
    """LinkedIn visitors should see elevated contact and experience items."""

    @pytest.fixture
    def linkedin_context(self) -> VisitorContext:
        return VisitorContext(referrer="https://linkedin.com/in/recruiter")

    @pytest.mark.asyncio
    async def test_linkedin_elevates_contact(
        self,
        llm_provider: object,
        linkedin_context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        result = await assemble_manifest(linkedin_context, catalog, llm_provider)
        assert _score(result, "contact") > 0.7

    @pytest.mark.asyncio
    async def test_linkedin_elevates_experience(
        self,
        llm_provider: object,
        linkedin_context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        result = await assemble_manifest(linkedin_context, catalog, llm_provider)
        assert _score(result, "experience-current") > 0.7
        assert _score(result, "experience-deloitte") > 0.7

    @pytest.mark.asyncio
    async def test_linkedin_scores_higher_than_defaults(
        self,
        llm_provider: object,
        linkedin_context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        result = await assemble_manifest(linkedin_context, catalog, llm_provider)
        defaults = {item.id: item.default_importance for item in catalog}
        assert _score(result, "contact") > defaults["contact"]
        assert _score(result, "experience-current") > defaults["experience-current"]
