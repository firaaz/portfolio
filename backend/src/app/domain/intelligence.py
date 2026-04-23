"""Intelligence result models — unified output for all evaluation strategies."""

from pydantic import BaseModel, Field


class ItemResult(BaseModel):
    """One item's evaluation: importance + optional emphasis and generated content."""

    id: str
    importance: float = Field(ge=0.0, le=1.0)
    emphasis: list[str] | None = None
    generated: dict[str, str] | None = None


class BridgeAnnotation(BaseModel):
    """A connection between two content items, grounded in catalog facts."""

    source_id: str
    target_id: str
    text: str
    grounding: list[str]


class IntelligenceResult(BaseModel):
    """Unified result from any evaluation strategy."""

    items: list[ItemResult] = Field(min_length=1)
    bridges: list[BridgeAnnotation] | None = None
