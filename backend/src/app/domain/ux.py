"""UX protocol domain models — four fundamental dimensions."""

from typing import Any

from pydantic import BaseModel, Field


class UXGlobals(BaseModel):
    """Global UX dimensions: tempo and agency."""

    tempo: float = Field(default=0.5, ge=0.0, le=1.0)
    agency: float = Field(default=0.5, ge=0.0, le=1.0)


class UXItem(BaseModel):
    """A content item with UX dimensions: salience and group."""

    id: str
    salience: float = Field(ge=0.0, le=1.0)
    group: str
    molecule: str
    data: dict[str, Any]


class UXState(BaseModel):
    """Full UX protocol state: globals + items."""

    ux: UXGlobals = Field(default_factory=UXGlobals)
    items: list[UXItem] = Field(min_length=1)
