"""EDD: LLM output must always parse to a valid Manifest with all catalog items."""

import pytest

from app.domain.agent import assemble_manifest
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest


class FakeLLMPort:
    """Proxy that records calls and delegates to the real LLM provider."""

    def __init__(self, real_port: object) -> None:
        self._real = real_port

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest:
        return await self._real.assemble_manifest(context, catalog)


@pytest.mark.eval
class TestManifestSchema:
    """LLM output must be a valid Manifest with all 13 items and scores in range."""

    @pytest.fixture
    def context(self) -> VisitorContext:
        return VisitorContext(referrer="https://linkedin.com/in/someone")

    @pytest.mark.asyncio
    async def test_output_parses_to_valid_manifest(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        port = FakeLLMPort(llm_provider)
        result = await assemble_manifest(context, catalog, port)
        assert isinstance(result, Manifest)

    @pytest.mark.asyncio
    async def test_all_catalog_ids_present(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
        catalog_ids: set[str],
    ) -> None:
        port = FakeLLMPort(llm_provider)
        result = await assemble_manifest(context, catalog, port)
        result_ids = {item.id for item in result.items}
        assert result_ids == catalog_ids

    @pytest.mark.asyncio
    async def test_all_scores_in_range(
        self,
        llm_provider: object,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        port = FakeLLMPort(llm_provider)
        result = await assemble_manifest(context, catalog, port)
        for item in result.items:
            assert 0.0 <= item.importance <= 1.0, (
                f"{item.id} importance {item.importance} out of range"
            )
