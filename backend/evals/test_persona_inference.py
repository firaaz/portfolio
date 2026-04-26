"""EDD evals — ReadStrategy persona inference."""

import os

import pytest

from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.persona import Persona
from app.domain.persona_evaluation import evaluate_persona
from app.domain.session import BehavioralSignal, VisitorProfile
from app.domain.strategies.read import SYSTEM_PROMPT as READ_SYSTEM_PROMPT
from app.domain.strategies.read import ReadStrategy


@pytest.fixture
def read_llm() -> PydanticAIProvider:
    """Pydantic-AI provider — required for ReadStrategy's structured Persona output."""
    if not os.environ.get("LLM_API_KEY"):
        pytest.skip("LLM_API_KEY not set")
    return PydanticAIProvider()


def _has_observation(persona: Persona, dimension: str, value_substring: str) -> bool:
    """Return True if any observation matches dimension and contains value substring."""
    return any(
        obs.dimension == dimension and value_substring.lower() in obs.value.lower()
        for obs in persona.observations
    )


@pytest.mark.eval
class TestReadStrategyLinkedInTechnical:
    """LinkedIn referrer + deep technical dwell -> recruiter + engineer + technical."""

    @pytest.mark.asyncio
    async def test_recognizes_recruiter_engineer_and_technical_depth(
        self,
        read_llm: PydanticAIProvider,
        catalog: list[ContentItem],
    ) -> None:
        """LinkedIn-referred visitor with engineering-card dwells should multivoice."""
        profile = VisitorProfile(
            session_id="eval-linkedin-technical",
            context=VisitorContext(referrer="https://linkedin.com/in/some-recruiter"),
        )
        # Long dwells on engineering project cards + a skip on contact =
        # evaluating engineering depth, not yet seeking to make contact.
        signals = [
            BehavioralSignal(
                type="dwell",
                card_id="project-salama",
                duration_ms=8500,
                timestamp=1.0,
            ),
            BehavioralSignal(
                type="dwell",
                card_id="project-salama",
                duration_ms=6200,
                timestamp=12.0,
            ),
            BehavioralSignal(
                type="click",
                card_id="project-salama",
                duration_ms=0,
                timestamp=13.0,
            ),
            BehavioralSignal(
                type="dwell",
                card_id="project-genai-migration",
                duration_ms=7800,
                timestamp=20.0,
            ),
            BehavioralSignal(
                type="skip",
                card_id="contact",
                duration_ms=200,
                timestamp=22.0,
            ),
            BehavioralSignal(
                type="dwell",
                card_id="experience-current",
                duration_ms=4500,
                timestamp=28.0,
            ),
        ]
        for sig in signals:
            profile.accumulate(sig)

        persona = await evaluate_persona(
            ReadStrategy(),
            READ_SYSTEM_PROMPT,
            read_llm,
            profile,
            catalog,
        )

        assert persona is not None, "evaluate_persona returned None"

        # The multivoice rule should produce at least two role observations.
        roles = [obs for obs in persona.observations if obs.dimension == "role"]
        assert len(roles) >= 2, (
            f"Expected >=2 role observations (recruiter + engineer); got {len(roles)}: "
            f"{[(o.value, o.confidence) for o in roles]}"
        )
        assert _has_observation(persona, "role", "recruiter"), (
            "Missing role=recruiter; observations: "
            f"{[(o.dimension, o.value) for o in persona.observations]}"
        )
        assert _has_observation(persona, "role", "engineer"), (
            "Missing role=engineer; observations: "
            f"{[(o.dimension, o.value) for o in persona.observations]}"
        )
        # The dwell pattern is technical depth, not outcome-focused skim.
        assert _has_observation(persona, "depth", "technical"), (
            "Missing depth=technical; observations: "
            f"{[(o.dimension, o.value) for o in persona.observations]}"
        )
        # The agent's rationale should cite the behavior that drove the read.
        rationale_blob = " ".join(
            [persona.rationale] + [obs.rationale for obs in persona.observations]
        ).lower()
        assert any(
            kw in rationale_blob
            for kw in ("dwell", "time", "spent", "engage", "linger", "linkedin")
        ), f"Rationale doesn't reference dwell/time/engagement: {rationale_blob}"
