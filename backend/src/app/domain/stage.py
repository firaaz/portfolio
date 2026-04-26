"""Stage selector — pure function from (persona, steer) to voice_tag."""

from pydantic import BaseModel

from app.domain.persona import Persona

_LETTER_THRESHOLD = 0.4
_DIALOGUE_THRESHOLD = 0.7


class VisitorSteer(BaseModel):
    """Visitor-driven voice override (e.g. Cmd+K → forced dialogue)."""

    requested_voice: str


def select_voice(persona: Persona, steer: VisitorSteer | None) -> str:
    """Return the active voice tag for a given persona and optional steer."""
    if steer is not None:
        return steer.requested_voice
    if persona.trust >= _DIALOGUE_THRESHOLD:
        return "dialogue"
    if persona.trust >= _LETTER_THRESHOLD:
        return "letter"
    return "whisper"
