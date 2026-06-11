import logging
import os

from pgvector.psycopg2 import register_vector
from psycopg2 import pool

logger = logging.getLogger(__name__)


def _pool_connection_kwargs():
    database_url = os.getenv("DATABASE_URL")
    sslmode = os.getenv("DB_SSLMODE", "require")

    if database_url:
        return {"dsn": database_url, "sslmode": sslmode}

    return {
        "host": os.getenv("DB_HOST", "latteshub_db"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "sslmode": sslmode,
    }

try:
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=20,
        **_pool_connection_kwargs(),
    )
    logger.info("Pool de conexoes PostgreSQL inicializado com sucesso.")
except Exception as e:
    logger.error(f"Erro ao inicializar o pool de conexoes: {e}")
    raise e


def get_db_connection():
    """Dependency para injetar a conexao nos endpoints do FastAPI."""
    conn = db_pool.getconn()
    try:
        register_vector(conn)
        yield conn
    finally:
        try:
            if not conn.closed:
                conn.rollback()
        except Exception:
            logger.exception("Erro ao limpar transacao antes de devolver conexao ao pool.")
            db_pool.putconn(conn, close=True)
        else:
            db_pool.putconn(conn)
