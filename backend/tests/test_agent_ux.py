"""Tests for agent UX state assembly."""

from unittest.mock import AsyncMock

from app.domain.agent import assemble_ux_state
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.ux import UXGlobals, UXItem, UXState


class TestAssembleUXState:
    """assemble_ux_state delegates to LLM and falls back to defaults."""

    async def test_calls_llm_and_returns_ux_state(self) -> None:
        catalog = [
            ContentItem(
                id="hero",
                molecule="hero",
                default_importance=1.0,
                default_group="identity",
                data={
                    "name": "F",
                    "title": "T",
                    "subtitle": "S",
                    "summary": "Sum",
                },
            ),
        ]
        expected = UXState(
            ux=UXGlobals(tempo=0.4, agency=0.6),
            items=[
                UXItem(
                    id="hero",
                    salience=0.95,
                    group="identity",
                    molecule="hero",
                    data=catalog[0].data,
                ),
            ],
        )
        mock_llm = AsyncMock()
        mock_llm.assemble_ux_state.return_value = expected
        context = VisitorContext(referrer=None, referrer_type="direct")

        result = await assemble_ux_state(context, catalog, mock_llm)

        assert result.ux.tempo == 0.4
        assert result.items[0].salience == 0.95

    async def test_falls_back_to_defaults_on_error(self) -> None:
        catalog = [
            ContentItem(
                id="hero",
                molecule="hero",
                default_importance=1.0,
                default_group="identity",
                data={
                    "name": "F",
                    "title": "T",
                    "subtitle": "S",
                    "summary": "Sum",
                },
            ),
        ]
        mock_llm = AsyncMock()
        mock_llm.assemble_ux_state.side_effect = RuntimeError("LLM down")
        context = VisitorContext(referrer=None, referrer_type="direct")

        result = await assemble_ux_state(context, catalog, mock_llm)

        assert result.ux.tempo == 0.5
        assert result.items[0].salience == 1.0
        assert result.items[0].group == "identity"
