"""Decision record — captures agent reasoning for transparency."""

from typing import Literal

from pydantic import BaseModel, Field

from app.domain.manifest import Manifest

_THRESHOLD = 0.05  # Minimum importance change to count as elevated/reduced


class ImportanceChange(BaseModel):
    """A single item's importance direction after adaptation."""

    item_id: str
    direction: Literal["elevated", "reduced"]


class DecisionRecord(BaseModel):
    """What the agent decided and why — shown in the transparency panel."""

    referrer_type: str
    command: str | None
    changes: list[ImportanceChange]
    reasoning: str = Field(min_length=1)


def build_decision(
    *,
    default: Manifest,
    refined: Manifest,
    referrer_type: str,
    command: str | None,
) -> DecisionRecord:
    """Compare default vs refined manifest and generate reasoning."""
    default_map = {item.id: item.importance for item in default.items}
    changes: list[ImportanceChange] = []

    for item in refined.items:
        diff = item.importance - default_map.get(item.id, 0.0)
        if diff > _THRESHOLD:
            changes.append(ImportanceChange(item_id=item.id, direction="elevated"))
        elif diff < -_THRESHOLD:
            changes.append(ImportanceChange(item_id=item.id, direction="reduced"))

    reasoning = _build_reasoning(referrer_type, command, changes)
    return DecisionRecord(
        referrer_type=referrer_type,
        command=command,
        changes=changes,
        reasoning=reasoning,
    )


def _build_reasoning(
    referrer_type: str,
    command: str | None,
    changes: list[ImportanceChange],
) -> str:
    """Generate a human-readable reasoning string."""
    elevated = [c.item_id for c in changes if c.direction == "elevated"]
    reduced = [c.item_id for c in changes if c.direction == "reduced"]

    parts: list[str] = []
    if command:
        parts.append(f'Command "{command}"')
    elif referrer_type != "direct":
        parts.append(f"Detected {referrer_type} referrer")
    else:
        parts.append("Adapted layout")

    if elevated:
        parts.append(f"elevated {', '.join(elevated)}")
    if reduced:
        parts.append(f"reduced {', '.join(reduced)}")

    return " — ".join(parts)
