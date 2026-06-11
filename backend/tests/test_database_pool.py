import pytest
from psycopg2.extensions import TRANSACTION_STATUS_IDLE

from app.core.database import get_db_connection, get_db_pool


def test_pool_connection_kwargs_defaults_sslmode_to_disable_for_local_db(monkeypatch):
    from app.core import database

    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DB_SSLMODE", raising=False)

    assert database._pool_connection_kwargs()["sslmode"] == "disable"


def test_pool_connection_kwargs_defaults_sslmode_to_require_for_database_url(monkeypatch):
    from app.core import database

    monkeypatch.setenv("DATABASE_URL", "postgresql://user:password@example.com/db")
    monkeypatch.delenv("DB_SSLMODE", raising=False)

    assert database._pool_connection_kwargs()["sslmode"] == "require"


def test_db_dependency_returns_connection_without_open_transaction():
    dependency = get_db_connection()
    conn = next(dependency)

    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    cursor.fetchone()
    cursor.close()

    with pytest.raises(StopIteration):
        next(dependency)

    active_pool = get_db_pool()
    pooled_conn = active_pool.getconn()
    try:
        assert pooled_conn.get_transaction_status() == TRANSACTION_STATUS_IDLE
    finally:
        pooled_conn.rollback()
        active_pool.putconn(pooled_conn)


def test_db_pool_retries_transient_startup_failure(monkeypatch):
    from app.core import database

    database.close_db_pool()
    attempts = []
    fake_pool = object()

    def flaky_pool(*args, **kwargs):
        attempts.append((args, kwargs))
        if len(attempts) == 1:
            raise RuntimeError("database system is starting up")
        return fake_pool

    monkeypatch.setattr(database.pool, "ThreadedConnectionPool", flaky_pool)
    monkeypatch.setenv("DB_POOL_INIT_ATTEMPTS", "2")
    monkeypatch.setenv("DB_POOL_INIT_DELAY_SECONDS", "0")

    try:
        assert database.get_db_pool() is fake_pool
        assert len(attempts) == 2
    finally:
        database.db_pool = None
