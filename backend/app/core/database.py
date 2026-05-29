import os
import logging
from psycopg2 import pool
from pgvector.psycopg2 import register_vector
from contextlib import contextmanager

logger = logging.getLogger(__name__)


def _pool_connection_kwargs():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return {"dsn": database_url}

    kwargs = {
        "host": os.getenv("DB_HOST", "latteshub_db"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
    }
    sslmode = os.getenv("DB_SSLMODE")
    if sslmode:
        kwargs["sslmode"] = sslmode
    return kwargs

# Configuração do Pool (Ajuste min/max conforme os recursos do container)
try:
    db_pool = pool.ThreadedConnectionPool(
        minconn=1,
        maxconn=20,
        **_pool_connection_kwargs(),
    )
    logger.info("Pool de conexões PostgreSQL inicializado com sucesso.")
except Exception as e:
    logger.error(f"Erro ao inicializar o pool de conexões: {e}")
    raise e


def get_db_connection():
    """Dependency para injetar a conexão nos endpoints do FastAPI."""
    conn = db_pool.getconn()
    try:
        # Garante que o adaptador do pgvector esteja registrado para a sessão ativa
        register_vector(conn)
        yield conn
    finally:
        # Devolve a conexão ao pool
        db_pool.putconn(conn)
