"""Shared test fixtures — ensures unit tests never hit real LLM APIs."""

from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def _no_llm_in_unit_tests():
    """Prevent unit tests from calling real LLM providers."""
    with patch(
        "app.adapters.api.stream_route._get_llm_port",
        return_value=None,
    ):
        yield
