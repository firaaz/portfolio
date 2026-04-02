"""Shared fixtures for LLM evaluation tests."""

import pytest

from app.adapters.content.yaml_loader import load_catalog
from app.domain.content import ContentItem


@pytest.fixture(scope="session")
def catalog() -> list[ContentItem]:
    """Load the real content catalog from YAML."""
    return load_catalog()


@pytest.fixture(scope="session")
def catalog_ids(catalog: list[ContentItem]) -> set[str]:
    """Set of all content item IDs in the catalog."""
    return {item.id for item in catalog}
