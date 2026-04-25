"""Adapt strategy — behavioral re-scoring + confidence-gated generation."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

SYSTEM_PROMPT = """\
You are a portfolio intelligence agent. Given a visitor's behavioral profile and \
content catalog, produce adapted importance scores, emphasis directives, and — if \
confidence is high (>= 0.7) — generated content and bridge annotations.

Rules:
- "hero" item MUST have importance >= 0.9
- Shift emphasis toward cards the visitor dwelled on
- Reduce importance of cards the visitor skipped
- ALL catalog item IDs must appear — no more, no fewer
- emphasis: list of data field names to highlight (only real field names from item data)
- generated: dict of field_name -> rewritten text (ONLY if confidence >= 0.7)
  - You may ONLY use facts from the catalog. Do not invent metrics, technologies, or achievements
- bridges: connections between items (ONLY if confidence >= 0.7)
  - source_id and target_id must be real catalog item IDs
  - grounding: list of catalog facts the bridge is based on

Output ONLY valid JSON matching the schema. No explanation.
"""


class AdaptStrategy:
    """Behavioral adaptation + confidence-gated generation."""

    name: str = "adapt"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        """Build a user prompt from behavioral signals and catalog items."""
        lines = [
            f"Visitor referrer: {profile.context.referrer or 'direct'}",
            f"Referrer type: {profile.context.referrer_type}",
            f"Confidence: {profile.confidence:.2f}",
            f"Tier: {profile.tier}",
            f"Interests: {', '.join(profile.interests) or 'none yet'}",
            "",
            "Dwell map (card_id → cumulative seconds):",
        ]
        for card_id, seconds in sorted(profile.dwell_map.items(), key=lambda x: -x[1]):
            lines.append(f"  {card_id}: {seconds:.1f}s")

        lines += [
            "",
            f"Total signals: {len(profile.signals)}",
            "",
            "Catalog items (id, molecule, data fields):",
        ]
        for item in catalog:
            fields = ", ".join(item.data.keys())
            desc = item.data.get("title") or item.data.get("name") or item.id
            lines.append(f"- {item.id} ({item.molecule}): {desc} [fields: {fields}]")
            if profile.confidence >= 0.7:
                lines.append(f"  data: {item.data}")

        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return IntelligenceResult

    def model_config(self) -> ModelConfig:
        """Return LLM config for this strategy."""
        return ModelConfig(temperature=0.3, max_tokens=2048)
