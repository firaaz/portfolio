"""Per-session async event bus — broadcast fan-out with drop-oldest backpressure."""

import asyncio
import contextlib
from collections.abc import AsyncIterator

_DEFAULT_QUEUE_MAXSIZE = 64


class SessionEventBus:
    """In-memory pub/sub keyed by session_id, with multi-subscriber broadcast.

    Each subscriber gets its own bounded queue. publish() fans out to every
    queue under the session_id; on a full queue, the oldest event is dropped
    in favour of the newest. Late subscribers do not see events published
    before they attached — the bus is real-time, not a log.
    """

    def __init__(self, queue_maxsize: int = _DEFAULT_QUEUE_MAXSIZE) -> None:
        self._queues: dict[str, list[asyncio.Queue[str]]] = {}
        self._lock: asyncio.Lock = asyncio.Lock()
        self._queue_maxsize: int = queue_maxsize

    async def publish(self, session_id: str, event: str) -> None:
        """Fan out one event to all subscribers of session_id (drop-oldest if full)."""
        async with self._lock:
            queues = list(self._queues.get(session_id, ()))
        for queue in queues:
            self._put_or_drop_oldest(queue, event)

    async def subscribe(self, session_id: str) -> AsyncIterator[str]:
        """Yield events published to session_id. Cleans up own queue on cancel."""
        queue: asyncio.Queue[str] = asyncio.Queue(maxsize=self._queue_maxsize)
        async with self._lock:
            self._queues.setdefault(session_id, []).append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            async with self._lock:
                if session_id in self._queues:
                    if queue in self._queues[session_id]:
                        self._queues[session_id].remove(queue)
                    if not self._queues[session_id]:
                        del self._queues[session_id]

    def _put_or_drop_oldest(self, queue: asyncio.Queue[str], event: str) -> None:
        """Insert event; on overflow, drop one oldest entry to make room."""
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            with contextlib.suppress(asyncio.QueueEmpty):
                queue.get_nowait()
            queue.put_nowait(event)


_bus_instance: SessionEventBus | None = None


def get_event_bus() -> SessionEventBus:
    """Return the process-wide SessionEventBus singleton.

    Producer (signal_route) and consumer (stream_route) must share the same
    instance — otherwise events publish into one bus and subscribers wait on
    a different one.
    """
    global _bus_instance
    if _bus_instance is None:
        _bus_instance = SessionEventBus()
    return _bus_instance
