"""Tests for agent service — manifest assembly with LLM fallback."""

import pytest

from app.adapters.content.yaml_loader import load_catalog
from app.domain.agent import assemble_manifest
from app.domain.content import ContentItem, content_to_manifest
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest, ManifestItem


class FakeLLMPort:
    """Fake LLM that returns a predetermined manifest."""

    def __init__(self, manifest: Manifest) -> None:
        self._manifest = manifest
        self.called = False

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest:
        self.called = True
        return self._manifest


class FailingLLMPort:
    """Fake LLM that always raises."""

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest:
        msg = "LLM unavailable"
        raise RuntimeError(msg)


class TestAssembleManifest:
    """Agent assembles manifest via LLM, falls back on error."""

    @pytest.fixture
    def catalog(self) -> list[ContentItem]:
        return load_catalog()

    @pytest.fixture
    def context(self) -> VisitorContext:
        return VisitorContext(referrer="https://linkedin.com/in/someone")

    @pytest.fixture
    def refined_manifest(self, catalog: list[ContentItem]) -> Manifest:
        """A manifest with adjusted importance scores."""
        items = [
            ManifestItem(
                id=item.id,
                importance=min(item.default_salience + 0.1, 1.0),
                molecule=item.molecule,
                data=item.data,
            )
            for item in catalog
        ]
        return Manifest(items=items)

    @pytest.mark.asyncio
    async def test_calls_llm_and_returns_result(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
        refined_manifest: Manifest,
    ) -> None:
        llm = FakeLLMPort(refined_manifest)
        result = await assemble_manifest(context, catalog, llm)
        assert llm.called
        assert result == refined_manifest

    @pytest.mark.asyncio
    async def test_result_has_all_items(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
        refined_manifest: Manifest,
    ) -> None:
        llm = FakeLLMPort(refined_manifest)
        result = await assemble_manifest(context, catalog, llm)
        assert len(result.items) == len(catalog)

    @pytest.mark.asyncio
    async def test_falls_back_on_llm_error(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        llm = FailingLLMPort()
        result = await assemble_manifest(context, catalog, llm)
        default = content_to_manifest(catalog)
        assert result == default

    @pytest.mark.asyncio
    async def test_never_raises(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> None:
        llm = FailingLLMPort()
        result = await assemble_manifest(context, catalog, llm)
        assert isinstance(result, Manifest)
