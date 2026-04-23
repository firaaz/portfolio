"""Select strategy — referrer-based scoring + emphasis directives."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

SYSTEM_PROMPT = """\
You are a portfolio layout agent. Given a visitor context and content catalog, \
assign an importance score (0.0-1.0) and emphasis directives for each item.

Rules:
- "hero" item MUST have importance >= 0.9
- LinkedIn visitors: elevate contact and experience (>= 0.7), emphasize leadership fields \
(company, role, duration for experience; cta for contact)
- GitHub visitors: elevate projects and skills, emphasize technical fields \
(tech, description for projects)
- Direct/unknown: balanced defaults close to catalog defaults
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: list of data field names to highlight for this visitor (can be empty)
- Do NOT invent field names — only use fields that exist in the item's data

Output ONLY valid JSON matching the schema. No explanation.
"""


class SelectStrategy:
    """Referrer-based scoring + emphasis directives."""

    name: str = "select"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        """Build a user prompt from visitor referrer and catalog items."""
        lines = [
            f"Visitor referrer: {profile.context.referrer or 'direct'}",
            f"Referrer type: {profile.context.referrer_type}",
            "",
            "Catalog items (id, molecule, data fields):",
        ]
        for item in catalog:
            fields = ", ".join(item.data.keys())
            desc = item.data.get("title") or item.data.get("name") or item.id
            lines.append(f"- {item.id} ({item.molecule}): {desc} [fields: {fields}]")
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        """Return LLM config for this strategy."""
        return ModelConfig(temperature=0.1, max_tokens=1024)
