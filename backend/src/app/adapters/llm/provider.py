"""LLM provider adapter — calls OpenAI-compatible API for manifest scoring."""

import asyncio
import json
import logging
import os
import re

from openai import AsyncOpenAI, RateLimitError

from app.domain.content import ContentItem
from app.domain.context import VisitorContext
from app.domain.manifest import Manifest, ManifestItem

_log = logging.getLogger(__name__)
_MAX_RETRIES = 3

_SYSTEM_PROMPT = """\
You are a portfolio layout agent. Given a visitor context and a content catalog, \
assign an importance score (0.0-1.0) to each catalog item based on relevance \
to this visitor.

Rules:
- The "hero" item MUST have importance >= 0.9
- LinkedIn visitors: elevate contact and experience items (>= 0.7)
- GitHub visitors: elevate project and skill items
- When a visitor command is provided, prioritize relevant items (>= 0.8)
- Direct/unknown visitors: use balanced defaults close to the catalog defaults
- ALL catalog item IDs must appear in your output — no more, no fewer
- Scores must be between 0.0 and 1.0 inclusive

Output ONLY a JSON array, no explanation, no markdown fences:
[{"id": "hero", "importance": 0.95}, {"id": "contact", "importance": 0.85}, ...]
"""


def _build_user_prompt(
    context: VisitorContext,
    catalog: list[ContentItem],
) -> str:
    """Build the user prompt from visitor context and catalog."""
    lines = [
        f"Visitor referrer: {context.referrer or 'direct'}",
        f"Referrer type: {context.referrer_type}",
    ]
    if context.command:
        lines.append(f"Visitor command: {context.command}")
    lines += ["", "Catalog items:"]
    for item in catalog:
        desc = item.data.get("title") or item.data.get("name") or item.id
        lines.append(f"- {item.id} ({item.molecule}): {desc}")
    return "\n".join(lines)


def _parse_scores(
    raw: str,
    catalog: list[ContentItem],
) -> Manifest:
    """Parse LLM JSON response into a Manifest, mapping scores to items."""
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    scores: list[dict[str, object]] = json.loads(cleaned)
    catalog_map = {item.id: item for item in catalog}
    items: list[ManifestItem] = []
    for entry in scores:
        item_id = str(entry["id"])
        importance = float(entry["importance"])
        source = catalog_map[item_id]
        items.append(
            ManifestItem(
                id=item_id,
                importance=importance,
                molecule=source.molecule,
                data=source.data,
            ),
        )
    return Manifest(items=items)


class LLMProvider:
    """OpenAI-compatible LLM adapter implementing LLMPort."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(
            api_key=os.environ["LLM_API_KEY"],
            base_url=os.environ.get("LLM_BASE_URL"),
        )
        self._model = os.environ.get("LLM_MODEL", "gpt-4o-mini")

    async def assemble_manifest(
        self,
        context: VisitorContext,
        catalog: list[ContentItem],
    ) -> Manifest:
        """Call the LLM and parse the response into a scored manifest."""
        user_prompt = _build_user_prompt(context, catalog)
        for attempt in range(_MAX_RETRIES):
            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.1,
                    max_tokens=1024,
                )
                raw = response.choices[0].message.content or ""
                return _parse_scores(raw, catalog)
            except RateLimitError:
                if attempt == _MAX_RETRIES - 1:
                    raise
                wait = 2 ** (attempt + 1)
                _log.warning("Rate limited, retrying in %ds", wait)
                await asyncio.sleep(wait)
        msg = "Unreachable"
        raise RuntimeError(msg)
