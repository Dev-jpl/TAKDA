"""
Integration-style tests for the modules router.
Supabase is mocked — no real DB connections.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch


@pytest.fixture
def client():
    """TestClient with supabase fully mocked out."""
    mock_sb = MagicMock()

    with patch("database.supabase", mock_sb):
        from main import app
        yield TestClient(app), mock_sb


class TestGetModuleEntries:

    def test_returns_entries_list(self, client):
        test_client, mock_sb = client
        mock_sb.table.return_value.select.return_value \
            .eq.return_value.eq.return_value \
            .order.return_value.limit.return_value \
            .execute.return_value.data = [
                {"id": "e1", "module_def_id": "def-1", "data": {"calories": 500}, "created_at": "2026-05-01T10:00:00Z"}
            ]

        resp = test_client.get("/modules/def-1/entries?user_id=user-1")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_empty_entries_returns_list(self, client):
        test_client, mock_sb = client
        mock_sb.table.return_value.select.return_value \
            .eq.return_value.eq.return_value \
            .order.return_value.limit.return_value \
            .execute.return_value.data = []

        resp = test_client.get("/modules/def-999/entries?user_id=user-1")
        assert resp.status_code == 200
        assert resp.json() == []


class TestCreateModuleEntry:

    def test_creates_entry_successfully(self, client):
        test_client, mock_sb = client
        created = {
            "id": "new-entry-id",
            "module_def_id": "def-1",
            "user_id": "user-1",
            "hub_id": "hub-1",
            "data": {"calories": 450},
            "schema_key": "default",
            "created_at": "2026-05-11T10:00:00Z",
        }
        mock_sb.table.return_value.insert.return_value.execute.return_value.data = [created]

        resp = test_client.post("/modules/def-1/entries", json={
            "user_id": "user-1",
            "hub_id":  "hub-1",
            "data":    {"calories": 450},
        })
        assert resp.status_code == 200
        assert resp.json()["id"] == "new-entry-id"

    def test_missing_user_id_returns_error(self, client):
        test_client, _ = client
        resp = test_client.post("/modules/def-1/entries", json={"data": {}})
        # Should fail validation (user_id is required)
        assert resp.status_code in (400, 422)
