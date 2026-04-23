"""Tests for five-verb AG-UI event formatters."""

import json


class TestFocusEvent:
    def test_format(self) -> None:
        from app.adapters.api.ux_events import ux_focus_event

        event = ux_focus_event("project-salama", 0.85, ["description", "tech"])
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["type"] == "CUSTOM"
        assert parsed["custom"]["eventType"] == "ux:focus"
        assert parsed["custom"]["item_id"] == "project-salama"
        assert parsed["custom"]["importance"] == 0.85
        assert parsed["custom"]["emphasis"] == ["description", "tech"]


class TestRecedeEvent:
    def test_format(self) -> None:
        from app.adapters.api.ux_events import ux_recede_event

        event = ux_recede_event("contact", 0.3)
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:recede"
        assert parsed["custom"]["item_id"] == "contact"
        assert parsed["custom"]["importance"] == 0.3


class TestBridgeEvent:
    def test_format(self) -> None:
        from app.adapters.api.ux_events import ux_bridge_event

        event = ux_bridge_event("project-salama", "experience-current", "Connected by architecture.")
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:bridge"
        assert parsed["custom"]["source_id"] == "project-salama"
        assert parsed["custom"]["target_id"] == "experience-current"
        assert parsed["custom"]["text"] == "Connected by architecture."


class TestSurfaceEvent:
    def test_format(self) -> None:
        from app.adapters.api.ux_events import ux_surface_event

        event = ux_surface_event("project-salama", {"description": "New text here."})
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:surface"
        assert parsed["custom"]["item_id"] == "project-salama"
        assert parsed["custom"]["generated"]["description"] == "New text here."


class TestSignalEvent:
    def test_format(self) -> None:
        from app.adapters.api.ux_events import ux_signal_event

        event = ux_signal_event(0.75, "Detected technical interest from dwell pattern.")
        parsed = json.loads(event.removeprefix("data: ").strip())
        assert parsed["custom"]["eventType"] == "ux:signal"
        assert parsed["custom"]["confidence"] == 0.75
        assert "technical" in parsed["custom"]["reasoning"]
