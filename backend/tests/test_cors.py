import pytest
from fastapi.testclient import TestClient

from app.main import create_app, get_cors_origins


@pytest.fixture()
def cors_client():
    with TestClient(create_app(["http://localhost:4200"])) as test_client:
        yield test_client


def test_cors_preflight_allows_configured_localhost(cors_client):
    response = cors_client.options(
        "/api/v1/producoes",
        headers={
            "Origin": "http://localhost:4200",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:4200"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_preflight_blocks_unconfigured_origin(cors_client):
    response = cors_client.options(
        "/api/v1/producoes",
        headers={
            "Origin": "https://malicious.example",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers


def test_cors_rejects_wildcard_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "*")

    with pytest.raises(RuntimeError, match="cannot include '\\*' in production"):
        get_cors_origins()
