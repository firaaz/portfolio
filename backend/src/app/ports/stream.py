"""Stream port — defines the contract for SSE event streaming."""

from collections.abc import AsyncIterator
from typing import Protocol


class StreamPort(Protocol):
    """Produces AG-UI events as SSE-formatted strings."""

    async def events(self) -> AsyncIterator[str]: ...
