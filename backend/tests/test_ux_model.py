"""Tests for UX protocol domain models."""

import pytest
from pydantic import ValidationError

from app.domain.ux import UXGlobals, UXItem, UXState


class TestUXGlobals:
    """UXGlobals validates tempo and agency range and defaults."""

    def test_valid_defaults(self) -> None:
        ux = UXGlobals()
        assert ux.tempo == 0.5
        assert ux.agency == 0.5

    def test_custom_values(self) -> None:
        ux = UXGlobals(tempo=0.2, agency=0.8)
        assert ux.tempo == 0.2
        assert ux.agency == 0.8

    def test_tempo_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(tempo=-0.1)

    def test_tempo_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(tempo=1.1)

    def test_agency_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(agency=-0.1)

    def test_agency_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXGlobals(agency=1.1)

    def test_tempo_at_zero(self) -> None:
        ux = UXGlobals(tempo=0.0)
        assert ux.tempo == 0.0

    def test_tempo_at_one(self) -> None:
        ux = UXGlobals(tempo=1.0)
        assert ux.tempo == 1.0

    def test_agency_at_zero(self) -> None:
        ux = UXGlobals(agency=0.0)
        assert ux.agency == 0.0

    def test_agency_at_one(self) -> None:
        ux = UXGlobals(agency=1.0)
        assert ux.agency == 1.0


class TestUXItem:
    """UXItem validates salience range, group, and molecule fields."""

    def test_valid_item(self) -> None:
        item = UXItem(
            id="hero",
            salience=0.95,
            group="identity",
            molecule="identity",
            data={"name": "Firaaz"},
        )
        assert item.id == "hero"
        assert item.salience == 0.95
        assert item.group == "identity"

    def test_salience_below_zero_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=-0.1, group="g", molecule="m", data={})

    def test_salience_above_one_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=1.1, group="g", molecule="m", data={})

    def test_group_required(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=0.5, molecule="m", data={})

    def test_salience_at_zero(self) -> None:
        item = UXItem(id="x", salience=0.0, group="g", molecule="m", data={})
        assert item.salience == 0.0

    def test_salience_at_one(self) -> None:
        item = UXItem(id="x", salience=1.0, group="g", molecule="m", data={})
        assert item.salience == 1.0

    def test_molecule_required(self) -> None:
        with pytest.raises(ValidationError):
            UXItem(id="x", salience=0.5, group="g", data={})


class TestUXState:
    """UXState validates globals default and non-empty items."""

    def test_valid_state(self) -> None:
        state = UXState(
            ux=UXGlobals(tempo=0.3, agency=0.7),
            items=[
                UXItem(
                    id="hero",
                    salience=0.95,
                    group="identity",
                    molecule="hero",
                    data={"name": "F"},
                ),
            ],
        )
        assert state.ux.tempo == 0.3
        assert len(state.items) == 1

    def test_empty_items_rejected(self) -> None:
        with pytest.raises(ValidationError):
            UXState(ux=UXGlobals(), items=[])

    def test_default_globals(self) -> None:
        state = UXState(
            items=[
                UXItem(id="a", salience=0.5, group="g", molecule="m", data={}),
            ],
        )
        assert state.ux.tempo == 0.5
        assert state.ux.agency == 0.5
