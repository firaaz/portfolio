"""Staggered dispatch — emits SSE events with configurable gaps (ADR-0003, ADR-0009)."""

import asyncio
import random
from collections.abc import AsyncGenerator


async def staggered_dispatch(
    events: list[str],
    min_gap_ms: int = 150,
    max_gap_ms: int = 350,
) -> AsyncGenerator[str]:
    """Yield events with a random gap between min_gap_ms and max_gap_ms."""
    for i, event in enumerate(events):
        if i > 0:
            gap = random.randint(min_gap_ms, max_gap_ms) / 1000.0
            await asyncio.sleep(gap)
        yield event
