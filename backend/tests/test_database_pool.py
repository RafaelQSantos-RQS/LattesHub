import pytest
from psycopg2.extensions import TRANSACTION_STATUS_IDLE

from app.core.database import db_pool, get_db_connection


def test_db_dependency_returns_connection_without_open_transaction():
    dependency = get_db_connection()
    conn = next(dependency)

    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    cursor.fetchone()
    cursor.close()

    with pytest.raises(StopIteration):
        next(dependency)

    pooled_conn = db_pool.getconn()
    try:
        assert pooled_conn.get_transaction_status() == TRANSACTION_STATUS_IDLE
    finally:
        pooled_conn.rollback()
        db_pool.putconn(pooled_conn)
