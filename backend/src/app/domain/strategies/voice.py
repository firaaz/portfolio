"""VoiceStrategy — voice-tag-parameterized utterance generation."""

from pydantic import BaseModel, Field

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import ModelConfig

WHISPER_PROMPT = """\
You are the agent's whisper voice — italic marginalia next to the canvas.
Output 1-3 short lines (<=12 words each). Each line is a quiet observation
about what the visitor seems to be doing or what the agent is noticing.

Tone: present-tense, first-person from the agent ("noticing…", "you read
slowly here…"). Never break the fourth wall. Never claim certainty.

You receive the agent's Persona (rationale, trust, observations). Speak
across multiple role observations when present — do not collapse to one.

Output ONLY a VoiceUtteranceList JSON object with `utterances`. Each
utterance has voice_tag="whisper" and utterance_kind="observation".
"""

LETTER_PROMPT = """\
You are the agent's letter voice — a 2 to 3 sentence cover-letter pitch
addressed to the visitor at the top of the canvas. Render in plain text;
the client decorates the typography (Zilla Slab serif).

Tone: present-tense, second-person ("you'll find…", "your team…"). Speak
to the inferred reader, not to a generic audience.

MULTIVOICE: address every role observation with confidence > 0.3,
weighted by confidence. If the persona reads as both recruiter (0.4) and
engineer (0.6), the letter should speak to a technical reader who is
also evaluating fit. Do not collapse to a single role.

Output ONLY a VoiceUtteranceList JSON object with a single utterance
(voice_tag="letter", utterance_kind="pitch", references=[]).
"""

VOICE_PROMPTS: dict[str, str] = {
    "whisper": WHISPER_PROMPT,
    "letter": LETTER_PROMPT,
}


class VoiceUtterance(BaseModel):
    """One utterance from a voice — wire-shape for VOICE_UTTERANCE event."""

    voice_tag: str
    utterance_kind: str
    content: str
    references: list[dict[str, str]] = Field(default_factory=list)


class VoiceUtteranceList(BaseModel):
    """LLM output container — list of utterances from one voice cycle."""

    utterances: list[VoiceUtterance] = Field(min_length=1)


class VoiceStrategy:
    """Voice-tag-parameterized utterance strategy.

    Looks up the prompt by voice_tag in VOICE_PROMPTS. Adding a voice =
    registering a new prompt key. The engine itself does not change.
    """

    def __init__(self, voice_tag: str) -> None:
        if voice_tag not in VOICE_PROMPTS:
            raise ValueError(
                f"Unknown voice_tag {voice_tag!r}; "
                f"register a prompt in VOICE_PROMPTS first."
            )
        self.voice_tag = voice_tag
        self.persona: Persona | None = None
        self.name: str = f"voice:{voice_tag}"

    def system_prompt(self) -> str:
        """Return the LLM system prompt for this voice."""
        return VOICE_PROMPTS[self.voice_tag]

    def build_prompt(self, profile: VisitorProfile, catalog: list[ContentItem]) -> str:
        """Build the user prompt; expects self.persona to be set."""
        if self.persona is None:
            return f"voice_tag={self.voice_tag}\n(no persona attached)"
        lines = [
            f"voice_tag: {self.voice_tag}",
            f"trust: {self.persona.trust:.2f}",
            f"persona rationale: {self.persona.rationale}",
            "",
            "observations:",
        ]
        for obs in self.persona.observations:
            lines.append(
                f"- dim={obs.dimension} value={obs.value} "
                f"confidence={obs.confidence:.2f} :: {obs.rationale}"
            )
        return "\n".join(lines)

    def result_schema(self) -> type[BaseModel]:
        """Return the structured output type for this strategy."""
        return VoiceUtteranceList

    def model_config(self) -> ModelConfig:
        """Return LLM config — slightly higher temperature for tonal variety."""
        return ModelConfig(temperature=0.5, max_tokens=512)
