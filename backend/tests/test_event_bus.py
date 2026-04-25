"""Tests for SessionEventBus — per-session async pub/sub primitive."""

import asyncio

import pytest

from app.adapters.sse.event_bus import SessionEventBus, get_event_bus


async def _drain(bus: SessionEventBus, session_id: str, count: int) -> list[str]:
    """Subscribe and collect `count` events, then break out cleanly."""
    received: list[str] = []
    async for event in bus.subscribe(session_id):
        received.append(event)
        if len(received) >= count:
            break
    return received


class TestSessionEventBus:
    """Per-session async event bus: broadcast fan-out + drop-oldest backpressure."""

    async def test_subscribe_yields_published_events_in_order(self) -> None:
        bus = SessionEventBus()
        consumer = asyncio.create_task(_drain(bus, "s1", 2))
        await asyncio.sleep(0)  # let consumer attach
        await bus.publish("s1", "event-a")
        await bus.publish("s1", "event-b")
        received = await asyncio.wait_for(consumer, timeout=1.0)
        assert received == ["event-a", "event-b"]

    async def test_subscribe_isolates_sessions(self) -> None:
        bus = SessionEventBus()
        consumer_a = asyncio.create_task(_drain(bus, "session-a", 1))
        consumer_b = asyncio.create_task(_drain(bus, "session-b", 1))
        await asyncio.sleep(0)
        await bus.publish("session-a", "for-a-only")
        await bus.publish("session-b", "for-b-only")
        a_events = await asyncio.wait_for(consumer_a, timeout=1.0)
        b_events = await asyncio.wait_for(consumer_b, timeout=1.0)
        assert a_events == ["for-a-only"]
        assert b_events == ["for-b-only"]

    async def test_subscribe_after_publish_does_not_replay(self) -> None:
        bus = SessionEventBus()
        await bus.publish("s1", "missed-event")
        consumer = asyncio.create_task(_drain(bus, "s1", 1))
        await asyncio.sleep(0)
        await bus.publish("s1", "live-event")
        received = await asyncio.wait_for(consumer, timeout=1.0)
        assert received == ["live-event"]

    async def test_subscribe_cancels_cleanly(self) -> None:
        bus = SessionEventBus()
        consumer = asyncio.create_task(_drain(bus, "s1", 99))
        await asyncio.sleep(0)
        consumer.cancel()
        with pytest.raises(asyncio.CancelledError):
            await consumer
        # After cancellation, queue should be removed from registry.
        assert "s1" not in bus._queues

    async def test_overflow_drops_oldest(self) -> None:
        bus = SessionEventBus(queue_maxsize=4)
        # Subscribe but don't drain — queue fills up.
        consumer = asyncio.create_task(_drain(bus, "s1", 4))
        await asyncio.sleep(0)
        for i in range(6):
            await bus.publish("s1", f"event-{i}")
        received = await asyncio.wait_for(consumer, timeout=1.0)
        # Oldest two (event-0, event-1) dropped; newest four kept.
        assert received == ["event-2", "event-3", "event-4", "event-5"]

    async def test_concurrent_subscribers_to_same_session_both_receive(self) -> None:
        bus = SessionEventBus()
        consumer_x = asyncio.create_task(_drain(bus, "s1", 1))
        consumer_y = asyncio.create_task(_drain(bus, "s1", 1))
        await asyncio.sleep(0)
        await bus.publish("s1", "broadcast")
        x_events = await asyncio.wait_for(consumer_x, timeout=1.0)
        y_events = await asyncio.wait_for(consumer_y, timeout=1.0)
        assert x_events == ["broadcast"]
        assert y_events == ["broadcast"]


class TestGetEventBus:
    """Module-level singleton accessor — producer and consumer share one bus."""

    def test_get_event_bus_returns_same_instance_across_calls(self) -> None:
        first = get_event_bus()
        second = get_event_bus()
        assert first is second

    def test_get_event_bus_returns_session_event_bus(self) -> None:
        assert isinstance(get_event_bus(), SessionEventBus)
