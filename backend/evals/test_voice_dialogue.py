"""EDD evals — VoiceStrategy dialogue voice (answer must address the visitor)."""

import os
from datetime import UTC, datetime

import pytest

from app.adapters.llm.pydantic_ai_provider import PydanticAIProvider
from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.persona import Observation, Persona, SignalRef
from app.domain.session import VisitorProfile
from app.domain.strategies.voice import VoiceStrategy
from app.domain.voice_evaluation import evaluate_voice


@pytest.fixture
def voice_llm() -> PydanticAIProvider:
    """Pydantic-AI provider — required for VoiceStrategy's structured output."""
    if not os.environ.get("LLM_API_KEY"):
        pytest.skip("LLM_API_KEY not set")
    return PydanticAIProvider()


# Substrings that, if found in the answer, indicate the LLM is narrating the
# visitor in third person rather than addressing them directly.
FORBIDDEN_THIRD_PERSON = (
    "the visitor",
    "their behavior",
    "the user is",
    "the user's",
    "they have spent",
    "they are looking",
)

# Substrings that indicate the LLM is leaking internal agent metadata into
# user-facing prose (trust scores, confidence numbers, observation framing).
FORBIDDEN_METADATA_LEAK = (
    "trust score",
    "confidence",
    "rationale",
    "observation",
    "i infer",
)

# Tokens consistent with second-person address. The answer must contain at
# least one — generic prose with no addressing can still smuggle in
# third-person framing.
SECOND_PERSON_MARKERS = (" you ", " you'", " your ", " yours")


def _now() -> datetime:
    return datetime.now(UTC)


def _signal_ref(sig_id: str) -> SignalRef:
    return SignalRef(kind="signal", id=sig_id)


@pytest.mark.eval
class TestDialogueAnswerVoice:
    """Dialogue answer addresses the visitor in 2nd person; no metadata leak."""

    @pytest.mark.asyncio
    async def test_answer_speaks_to_visitor_not_about_them(
        self,
        voice_llm: PydanticAIProvider,
        catalog: list[ContentItem],
    ) -> None:
        """Answer must be in second person, grounded in catalog, no metadata."""
        # Persona mirrors the post-D9b LinkedIn-technical screenshot scenario.
        persona = Persona(
            rationale=(
                "LinkedIn-referred visitor with deep dwells on engineering "
                "project cards and a skip on contact."
            ),
            trust=0.65,
            observations=[
                Observation(
                    dimension="role",
                    value="recruiter",
                    confidence=0.4,
                    rationale="LinkedIn referrer.",
                    source_signals=[_signal_ref("sig-referrer")],
                    ts=_now(),
                ),
                Observation(
                    dimension="role",
                    value="engineer",
                    confidence=0.6,
                    rationale="Long dwells on Salama and GenAI migration cards.",
                    source_signals=[_signal_ref("sig-dwell-salama")],
                    ts=_now(),
                ),
                Observation(
                    dimension="depth",
                    value="technical",
                    confidence=0.7,
                    rationale="Time on technical project descriptions.",
                    source_signals=[_signal_ref("sig-dwell-genai")],
                    ts=_now(),
                ),
            ],
        )

        profile = VisitorProfile(
            session_id="eval-dialogue-second-person",
            context=VisitorContext(
                referrer="https://linkedin.com/in/some-recruiter"
            ),
        )

        strategy = VoiceStrategy(voice_tag="dialogue")
        strategy.persona = persona

        result = await evaluate_voice(strategy, voice_llm, profile, catalog)
        assert result is not None, "evaluate_voice returned None"

        answers = [u for u in result.utterances if u.utterance_kind == "answer"]
        assert len(answers) == 1, (
            f"Expected exactly one answer utterance; got {len(answers)}: "
            f"{[u.utterance_kind for u in result.utterances]}"
        )
        answer = answers[0].content.lower()

        # Second-person addressing: at least one of "you / your / yours".
        assert any(marker in f" {answer} " for marker in SECOND_PERSON_MARKERS), (
            f"Answer does not address the visitor in second person: {answer!r}"
        )

        # No third-person narration of the visitor.
        leaks_third = [phrase for phrase in FORBIDDEN_THIRD_PERSON if phrase in answer]
        assert not leaks_third, (
            f"Answer narrates the visitor in third person ({leaks_third}): {answer!r}"
        )

        # No internal metadata leaking into the user-facing prose.
        leaks_meta = [phrase for phrase in FORBIDDEN_METADATA_LEAK if phrase in answer]
        assert not leaks_meta, (
            f"Answer leaks internal metadata ({leaks_meta}): {answer!r}"
        )

        # At least one receipt with a real catalog item ID — grounding check.
        catalog_ids = {item.id for item in catalog}
        receipts = [u for u in result.utterances if u.utterance_kind == "receipt"]
        assert receipts, "Expected at least one receipt utterance"
        cited_ids = {
            ref.get("id")
            for receipt in receipts
            for ref in receipt.references
            if ref.get("kind") == "item"
        }
        assert cited_ids & catalog_ids, (
            f"No receipt cites a real catalog item; cited={cited_ids}"
        )
