"""Voice evaluation orchestrator — runs a VoiceStrategy through an LLM port."""

import logging

from app.domain.content import ContentItem
from app.domain.session import VisitorProfile
from app.domain.strategies.voice import VoiceStrategy, VoiceUtteranceList
from app.ports.llm import LLMPort

_log = logging.getLogger(__name__)


async def evaluate_voice(
    strategy: VoiceStrategy,
    llm: LLMPort,
    profile: VisitorProfile,
    catalog: list[ContentItem],
) -> VoiceUtteranceList | None:
    """Run a voice strategy through the LLM, return None on failure."""
    user_prompt = strategy.build_prompt(profile, catalog)
    cfg = strategy.model_config()
    try:
        raw = await llm.evaluate(
            strategy_name=strategy.name,
            system_prompt=strategy.system_prompt(),
            user_prompt=user_prompt,
            result_type=strategy.result_schema(),
            temperature=cfg.temperature,
            max_tokens=cfg.max_tokens,
        )
    except Exception:
        _log.exception("LLM evaluate failed for strategy=%s", strategy.name)
        return None
    if not isinstance(raw, VoiceUtteranceList):
        _log.warning("LLM returned non-VoiceUtteranceList: %s", type(raw).__name__)
        return None
    return raw
