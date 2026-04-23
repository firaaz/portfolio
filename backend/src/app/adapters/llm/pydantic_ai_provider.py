"""PydanticAI LLM adapter — structured output via pydantic-ai agents."""

import logging
import os

from pydantic import BaseModel
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings

_log = logging.getLogger(__name__)


class PydanticAIProvider:
    """Stateless adapter: creates a fresh Agent per evaluate() call."""

    def __init__(self) -> None:
        self._model_name = os.environ.get("LLM_MODEL", "gpt-4o-mini")
        self._base_url = os.environ.get("LLM_BASE_URL", "https://api.openai.com/v1")
        self._api_key = os.environ.get("LLM_API_KEY", "")

    async def evaluate(
        self,
        strategy_name: str,
        system_prompt: str,
        user_prompt: str,
        result_type: type[BaseModel],
        temperature: float,
        max_tokens: int,
    ) -> BaseModel:
        """Run a PydanticAI agent with structured output."""
        model_name = os.environ.get(
            f"LLM_MODEL_{strategy_name.upper()}", self._model_name
        )
        provider = OpenAIProvider(
            base_url=self._base_url,
            api_key=self._api_key,
        )
        model = OpenAIChatModel(model_name, provider=provider)
        settings = ModelSettings(temperature=temperature, max_tokens=max_tokens)
        agent: Agent[None, BaseModel] = Agent(
            model,
            output_type=result_type,
            system_prompt=system_prompt,
            model_settings=settings,
        )
        result = await agent.run(user_prompt)
        _log.debug("strategy=%s tokens_used=%s", strategy_name, result.usage())
        return result.output
