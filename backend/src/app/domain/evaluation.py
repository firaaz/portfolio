"""Evaluation orchestrator — runs a strategy through an LLM port, validates output."""

import logging

from app.domain.content import ContentItem
from app.domain.intelligence import IntelligenceResult
from app.domain.session import VisitorProfile
from app.domain.strategy import EvaluationStrategy
from app.domain.validation import validate_result
from app.ports.llm import LLMPort

_log = logging.getLogger(__name__)


async def evaluate_intelligence(
    strategy: EvaluationStrategy,
    system_prompt: str,
    llm: LLMPort,
    profile: VisitorProfile,
    catalog: list[ContentItem],
) -> IntelligenceResult | None:
    """Run strategy through LLM, validate result, return None on failure."""
    user_prompt = strategy.build_prompt(profile, catalog)
    cfg = strategy.model_config()
    try:
        raw = await llm.evaluate(
            strategy_name=strategy.name,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            result_type=strategy.result_schema(),
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
        )
    except Exception:
        _log.exception("LLM evaluate failed for strategy=%s", strategy.name)
        return None
    if not isinstance(raw, IntelligenceResult):
        _log.warning("LLM returned non-IntelligenceResult: %s", type(raw).__name__)
        return None
    catalog_ids = {item.id for item in catalog}
    item_fields = {item.id: set(item.data.keys()) for item in catalog}
    errors = validate_result(raw, catalog_ids, item_fields)
    if errors:
        _log.warning("Intelligence validation errors: %s", errors[:3])
        return None
    return raw
