"""Tests for staggered event dispatch."""

import time


class TestStaggeredDispatch:
    async def test_yields_events_with_gaps(self) -> None:
        from app.adapters.api.dispatch import staggered_dispatch

        events = ["event1\n\n", "event2\n\n", "event3\n\n"]
        results = []
        timestamps = []
        async for event in staggered_dispatch(events, min_gap_ms=100, max_gap_ms=100):
            results.append(event)
            timestamps.append(time.monotonic())

        assert results == events
        assert len(timestamps) == 3
        for i in range(1, len(timestamps)):
            gap = (timestamps[i] - timestamps[i - 1]) * 1000
            assert gap >= 80

    async def test_single_event_no_delay(self) -> None:
        from app.adapters.api.dispatch import staggered_dispatch

        events = ["only\n\n"]
        results = []
        async for event in staggered_dispatch(events, min_gap_ms=500, max_gap_ms=500):
            results.append(event)
        assert results == ["only\n\n"]

    async def test_empty_yields_nothing(self) -> None:
        from app.adapters.api.dispatch import staggered_dispatch

        results = []
        async for event in staggered_dispatch([], min_gap_ms=100, max_gap_ms=100):
            results.append(event)
        assert results == []
