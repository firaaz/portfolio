"""Manifest domain model — zero framework imports beyond Pydantic."""

from typing import Any

from pydantic import BaseModel, Field


class ManifestItem(BaseModel):
    """A single content item with importance score for canvas placement."""

    id: str
    importance: float = Field(ge=0.0, le=1.0)
    molecule: str
    data: dict[str, Any]


class Manifest(BaseModel):
    """Ordered collection of manifest items. Must be non-empty."""

    items: list[ManifestItem] = Field(min_length=1)
