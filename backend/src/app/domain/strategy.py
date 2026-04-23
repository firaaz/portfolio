"""Evaluation strategy protocol — pluggable intelligence strategies."""

from typing import Protocol

from pydantic import BaseModel, Field

from app.domain.content import ContentItem
from app.domain.session import VisitorProfile


class ModelConfig(BaseModel):
    """LLM configuration per strategy."""

    model: str = "openai:gpt-4o-mini"
    temperature: float = Field(default=0.1, ge=0.0, le=1.0)
    max_tokens: int = Field(default=1024, ge=1)


class EvaluationStrategy(Protocol):
    """Protocol for pluggable intelligence strategies."""

    name: str

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str: ...

    def result_schema(self) -> type[BaseModel]: ...

    def model_config(self) -> ModelConfig: ...
