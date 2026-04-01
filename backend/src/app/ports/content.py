"""Content port — protocol for loading the content catalog."""

from typing import Protocol

from app.domain.content import ContentItem


class ContentPort(Protocol):
    """Loads content items from a catalog source."""

    def load_catalog(self) -> list[ContentItem]: ...
