import logging
import os
import threading
import time

from pgvector.psycopg2 import register_vector
from psycopg2 import pool

logger = logging.getLogger(__name__)

db_pool = None
_db_pool_lock = threading.Lock()


def _pool_connection_kwargs():
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        sslmode = os.getenv("DB_SSLMODE", "require")
        return {"dsn": database_url, "sslmode": sslmode}

    sslmode = os.getenv("DB_SSLMODE", "disable")
    return {
        "host": os.getenv("DB_HOST", "latteshub_db"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "sslmode": sslmode,
    }

def get_db_pool():
    global db_pool

    if db_pool is not None:
        return db_pool

    max_attempts = int(os.getenv("DB_POOL_INIT_ATTEMPTS", "10"))
    retry_delay = float(os.getenv("DB_POOL_INIT_DELAY_SECONDS", "2"))

    with _db_pool_lock:
        if db_pool is not None:
            return db_pool

        last_error = None
        for attempt in range(1, max_attempts + 1):
            try:
                db_pool = pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=20,
                    **_pool_connection_kwargs(),
                )
                logger.info("Pool de conexoes PostgreSQL inicializado com sucesso.")
                return db_pool
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "Tentativa %s/%s de inicializar o pool PostgreSQL falhou: %s",
                    attempt,
                    max_attempts,
                    exc,
                )
                if attempt < max_attempts:
                    time.sleep(retry_delay)

        logger.error("Erro ao inicializar o pool de conexoes: %s", last_error)
        raise last_error


def close_db_pool():
    global db_pool

    if db_pool is not None:
        db_pool.closeall()
        db_pool = None


def get_db_connection():
    """Dependency para injetar a conexao nos endpoints do FastAPI."""
    active_pool = get_db_pool()
    conn = active_pool.getconn()
    try:
        register_vector(conn)
        yield conn
    finally:
        try:
            if not conn.closed:
                conn.rollback()
        except Exception:
            logger.exception("Erro ao limpar transacao antes de devolver conexao ao pool.")
            active_pool.putconn(conn, close=True)
        else:
            active_pool.putconn(conn)
