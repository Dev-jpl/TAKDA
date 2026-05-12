"""
Shared fixtures and mocks for the TAKDA test suite.
Tests that call Supabase or external AI use monkeypatching — no real network calls.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock


@pytest.fixture
def mock_supabase(monkeypatch):
    """Replace the global supabase client with a MagicMock."""
    mock = MagicMock()
    monkeypatch.setattr("database.supabase", mock)
    return mock


@pytest.fixture
def sample_entries():
    """A small realistic set of module entries for evaluation tests."""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    return [
        {
            "id": f"entry-{i}",
            "module_def_id": "def-1",
            "user_id": "user-1",
            "hub_id": "hub-1",
            "data": {"calories": 300 + i * 50, "food_name": f"Food {i}", "meal_type": "lunch"},
            "created_at": (now - timedelta(hours=i * 2)).isoformat(),
            "schema_key": "default",
        }
        for i in range(5)
    ]
