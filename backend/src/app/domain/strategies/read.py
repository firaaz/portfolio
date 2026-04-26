"""ReadStrategy — infers a typed Persona from behavioral signals + context."""

from pydantic import BaseModel

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

SYSTEM_PROMPT = """\
You read visitor behavioral signals and infer who they are.
Output a Persona with observations along typed dimensions.

CORE DIMENSIONS (use these labels when applicable; extend if a pattern
doesn't fit any of them):
  - role    : the kind of person they appear to be
              (common values: recruiter, engineer, founder, builder,
               peer, curious, unknown — composites or novel labels OK)
  - intent  : what they're trying to accomplish
              (common values: hiring, evaluating, learning, comparing, browsing)
  - depth   : how technically deep they're reading
              (common values: technical, outcome-focused, brand-only)
  - source  : where their journey started (referrer-derived)

MULTIVOICE RULE:
When the visitor exhibits patterns matching multiple roles, EMIT MULTIPLE
observations with the same dimension. Use confidence to weight your degree
of belief. Do not collapse multi-modal visitors to a single label —
voices can address all matched roles.

CONVENTIONS:
  - Include an observation with dimension="role" when trust > 0.4.
  - Every observation MUST list at least one source_signals reference to
    a real signal id from the input batch.
  - source_signals MUST cite ids from the "Recent signals" block below
    (e.g. {"kind": "signal", "id": "s3"}). Do NOT cite card ids,
    catalog item ids, or invent ids.
  - Use new dimension names freely if the seed taxonomy doesn't fit.
  - Keep value strings short — composites should be multiple observations,
    not concatenated values.
  - Don't restate an observation if it doesn't materially differ from a
    recent one.
  - The top-level rationale summarises the read as a whole, in one or
    two short sentences.

Output ONLY valid JSON matching the Persona schema. No explanation.
"""


class ReadStrategy:
    """Persona-inference strategy. Output schema = Persona."""

    name: str = "read"

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        """Build a user prompt from behavioral signals + visitor context."""
        ctx = profile.context
        lines = [
            f"Visitor referrer: {ctx.referrer or 'direct'}",
            f"Referrer type: {ctx.referrer_type}",
            f"Confidence: {profile.confidence:.2f}",
            f"Tier: {profile.tier}",
        ]
        if ctx.command:
            lines.append(f"Latest command: {ctx.command}")
        if ctx.viewport:
            vp = ctx.viewport
            line = f"Viewport: {vp.width}x{vp.height}, pointer: {vp.pointer_type}"
            if vp.prefers_reduced_motion:
                line += ", prefers reduced motion"
            lines.append(line)
        if ctx.landing_path:
            lines.append(f"Landing path: {ctx.landing_path}")
        if ctx.user_agent_summary:
            ua = ctx.user_agent_summary
            lines.append(f"User agent: {ua.family} on {ua.platform}")

        lines += ["", "Recent signals (id, type, card, duration_ms):"]
        for idx, sig in enumerate(profile.signals[-20:]):
            lines.append(
                f"  s{idx}: {sig.type} card={sig.card_id} "
                f"duration_ms={sig.duration_ms} ts={sig.timestamp:.1f}"
            )

        if catalog:
            lines += ["", "Catalog ids visitor has been exposed to:"]
            for item in catalog:
                lines.append(f"- {item.id} ({item.molecule})")

        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return Persona

    def model_config(self) -> ModelConfig:
        """Return LLM config: low temperature, modest token budget."""
        return ModelConfig(temperature=0.2, max_tokens=1024)
