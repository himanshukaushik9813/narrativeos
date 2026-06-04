from fastapi.testclient import TestClient

from narrativeos_api.config import Settings, get_settings
from narrativeos_api.main import app, settings_dep


def test_narratives_fail_closed_without_sosovalue_key():
    get_settings.cache_clear()
    app.dependency_overrides[settings_dep] = lambda: Settings(sosovalue_api_key=None)

    try:
        response = TestClient(app).get("/api/narratives/top")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"]["missing"] == ["SOSOVALUE_API_KEY"]
