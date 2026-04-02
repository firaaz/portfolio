"""EDD: LLM output must only reference real catalog item IDs."""

import pytest

from app.domain.agent import assemble_manifest
from app.domain.content import ContentItem
from app.domain.context import VisitorContext


@pytest.mark.eval
class TestContentGrounding:
    """Agent output must not contain IDs that don't exist in the catalog."""

    @pytest.fixture
    def context(self) -> VisitorContext:
        return VisitorContext(referrer="https://linkedin.com/in/recruiter")

    @pytest.mark.asyncio
    async def test_no_extraneous_ids(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
        catalog_ids: set[str],
    ) -> None:
        result = await assemble_manifest(context, catalog, llm_provider)
        result_ids = {item.id for item in result.items}
        extraneous = result_ids - catalog_ids
        assert not extraneous, f"Agent produced unknown IDs: {extraneous}"

    @pytest.mark.asyncio
    async def test_no_missing_ids(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
        catalog_ids: set[str],
    ) -> None:
        result = await assemble_manifest(context, catalog, llm_provider)
        result_ids = {item.id for item in result.items}
        missing = catalog_ids - result_ids
        assert not missing, f"Agent omitted catalog IDs: {missing}"
