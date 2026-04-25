"""Tests for the behavioral signal ingestion endpoint."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestSignalRoute:
    def test_post_signals_returns_200(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session",
                "signals": [
                    {
                        "type": "dwell",
                        "card_id": "skills",
                        "duration_ms": 3000,
                        "timestamp": 1.0,
                    }
                ],
            },
        )
        assert response.status_code == 200

    def test_post_signals_returns_profile_summary(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "test-session-2",
                "signals": [
                    {
                        "type": "dwell",
                        "card_id": "featured",
                        "duration_ms": 5000,
                        "timestamp": 1.0,
                    },
                    {
                        "type": "click",
                        "card_id": "featured",
                        "duration_ms": 0,
                        "timestamp": 2.0,
                    },
                ],
            },
        )
        data = response.json()
        assert "session_id" in data
        assert "tier" in data
        assert "confidence" in data

    def test_rejects_invalid_signal_type(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={
                "session_id": "s",
                "signals": [
                    {"type": "scroll", "card_id": "x", "duration_ms": 0, "timestamp": 0}
                ],
            },
        )
        assert response.status_code == 422

    def test_empty_signals_accepted(self) -> None:
        response = client.post(
            "/api/agent/signal",
            json={"session_id": "s", "signals": []},
        )
        assert response.status_code == 200
