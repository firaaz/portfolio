"""Compose strategy — command bar cross-content synthesis."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

SYSTEM_PROMPT = """\
You are a portfolio intelligence agent. The visitor asked a question via the \
command bar. Compose a response by scoring items and generating relevant content.

Rules:
- Score items by relevance to the query (0.0-1.0)
- "hero" item MUST have importance >= 0.9
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: highlight fields relevant to the query
- generated: rewrite descriptions of the most relevant items to directly address \
the query. Use ONLY facts from the catalog. Do not invent anything.
- bridges: connect items that together answer the query
  - grounding: list of catalog facts supporting the bridge

Output ONLY valid JSON matching the schema. No explanation.
"""


class ComposeStrategy:
    """Command bar cross-content synthesis."""

    name: str = "compose"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        """Build a user prompt from the visitor's command and full catalog data."""
        command = profile.context.command or ""
        lines = [
            f"Visitor query: {command}",
            f"Referrer type: {profile.context.referrer_type}",
            "",
            "Catalog items (full data for composition):",
        ]
        for item in catalog:
            lines.append(f"- {item.id} ({item.molecule}): {item.data}")
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        """Return LLM config for this strategy."""
        return ModelConfig(temperature=0.5, max_tokens=2048)
