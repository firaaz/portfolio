"""Persona evaluation orchestrator — runs ReadStrategy through an LLM port."""

import logging

from app.domain.content import ContentItem
from app.domain.persona import Persona
from app.domain.session import VisitorProfile
from app.domain.strategy import EvaluationStrategy
from app.ports.llm import LLMPort

_log = logging.getLogger(__name__)


async def evaluate_persona(
    strategy: EvaluationStrategy,
    system_prompt: str,
    llm: LLMPort,
    profile: VisitorProfile,
    catalog: list[ContentItem],
) -> Persona | None:
    """Run a persona-producing strategy through the LLM, return None on failure."""
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
    if not isinstance(raw, Persona):
        _log.warning("LLM returned non-Persona: %s", type(raw).__name__)
        return None
    return raw
