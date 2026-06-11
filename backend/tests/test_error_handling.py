import logging

from app.core.database import get_db_connection
from app.core.errors import INTERNAL_SERVER_ERROR_DETAIL


class FailingDb:
    def cursor(self, *args, **kwargs):
        raise RuntimeError("internal database password=secret")

    def rollback(self):
        pass


def failing_db_connection():
    yield FailingDb()


def test_internal_error_response_is_generic_and_logs_detail(client, caplog):
    client.app.dependency_overrides[get_db_connection] = failing_db_connection

    try:
        with caplog.at_level(logging.ERROR):
            response = client.get("/api/v1/areas/")
    finally:
        client.app.dependency_overrides.clear()

    assert response.status_code == 500
    assert response.json() == {"detail": INTERNAL_SERVER_ERROR_DETAIL}
    assert "password=secret" not in response.text
    assert "password=secret" in caplog.text
