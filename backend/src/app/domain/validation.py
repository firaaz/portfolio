"""Post-generation catalog validation — ensures LLM output is grounded."""

from app.domain.intelligence import IntelligenceResult


def validate_result(
    result: IntelligenceResult,
    catalog_ids: set[str],
    item_fields: dict[str, set[str]],
) -> list[str]:
    """Validate an IntelligenceResult against the catalog. Returns error strings."""
    errors: list[str] = []

    for item in result.items:
        if item.id not in catalog_ids:
            errors.append(f"Unknown item ID: {item.id}")
        if item.emphasis:
            valid_fields = item_fields.get(item.id, set())
            for field in item.emphasis:
                if valid_fields and field not in valid_fields:
                    errors.append(f"Invalid emphasis field '{field}' for {item.id}")

    if result.bridges:
        for bridge in result.bridges:
            if bridge.source_id not in catalog_ids:
                errors.append(f"Bridge source unknown: {bridge.source_id}")
            if bridge.target_id not in catalog_ids:
                errors.append(f"Bridge target unknown: {bridge.target_id}")

    return errors
