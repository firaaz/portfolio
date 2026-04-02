"""Shared fixtures for LLM evaluation tests."""

import os

import pytest

from app.adapters.content.yaml_loader import load_catalog
from app.adapters.llm.provider import LLMProvider
from app.domain.content import ContentItem
from app.domain.context import VisitorContext


@pytest.fixture(scope="session")
def catalog() -> list[ContentItem]:
    """Load the real content catalog from YAML."""
    return load_catalog()


@pytest.fixture(scope="session")
def catalog_ids(catalog: list[ContentItem]) -> set[str]:
    """Set of all content item IDs in the catalog."""
    return {item.id for item in catalog}


@pytest.fixture(scope="session")
def llm_provider() -> LLMProvider:
    """Create a real LLM provider backed by an API key from the environment."""
    if not os.environ.get("LLM_API_KEY"):
        pytest.skip("LLM_API_KEY not set")
    return LLMProvider()


@pytest.fixture
def linkedin_context() -> VisitorContext:
    """Visitor context simulating a LinkedIn referrer."""
    return VisitorContext(referrer="https://linkedin.com/in/recruiter")


@pytest.fixture
def direct_context() -> VisitorContext:
    """Visitor context with no referrer (direct visit)."""
    return VisitorContext(referrer=None)
