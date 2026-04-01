"""YAML content catalog loader tests."""

from app.adapters.content.yaml_loader import load_catalog
from app.domain.content import ContentItem


class TestYamlLoader:
    """load_catalog reads catalog.yaml and returns validated ContentItems."""

    def test_loads_13_items(self) -> None:
        items = load_catalog()
        assert len(items) == 13

    def test_all_items_are_content_items(self) -> None:
        items = load_catalog()
        assert all(isinstance(item, ContentItem) for item in items)

    def test_each_item_has_id_and_molecule(self) -> None:
        items = load_catalog()
        for item in items:
            assert item.id
            assert item.molecule

    def test_no_duplicate_ids(self) -> None:
        items = load_catalog()
        ids = [item.id for item in items]
        assert len(ids) == len(set(ids))

    def test_contains_all_molecule_types(self) -> None:
        items = load_catalog()
        molecules = {item.molecule for item in items}
        assert molecules == {
            "hero",
            "project",
            "experience",
            "contact",
            "skill",
            "education",
        }
