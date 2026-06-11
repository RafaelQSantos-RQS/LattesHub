import os
import uuid
from pathlib import Path

import psycopg2
import pytest
from dotenv import load_dotenv
from fastapi.testclient import TestClient
from pgvector.psycopg2 import register_vector
from psycopg2.extras import RealDictCursor


REPO_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(REPO_ROOT / ".env")

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("DB_HOST", "db")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "lattes_hub")
os.environ.setdefault("DB_USER", "postgres")
os.environ.setdefault("DB_PASSWORD", "")


def _connection_kwargs():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return {"dsn": database_url}

    kwargs = {
        "host": os.getenv("DB_HOST"),
        "port": os.getenv("DB_PORT"),
        "dbname": os.getenv("DB_NAME"),
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
    }
    sslmode = os.getenv("DB_SSLMODE")
    if sslmode:
        kwargs["sslmode"] = sslmode
    return kwargs


def _vector_literal(values):
    return "[" + ",".join(str(value) for value in values) + "]"


@pytest.fixture(scope="session")
def db_conn():
    conn = psycopg2.connect(**_connection_kwargs())
    register_vector(conn)
    try:
        yield conn
    finally:
        conn.close()


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client

    from app.core.database import close_db_pool

    close_db_pool()


@pytest.fixture(scope="session")
def issue30_data(db_conn):
    suffix = uuid.uuid4().hex[:12]
    prefix = f"PYTEST_ISSUE30_{suffix}"
    lattes_id = f"pytest{suffix}"
    issn = f"PYT{suffix[:8]}"

    data = {"prefix": prefix, "lattes_id": lattes_id, "issn": issn}

    try:
        with db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO instituicoes (nome, cidade, estado, pais)
                VALUES (%s, 'Salvador', 'BA', 'Brasil')
                RETURNING id, nome, cidade, estado, pais;
                """,
                (f"{prefix} Instituto de Testes",),
            )
            data["instituicao"] = dict(cursor.fetchone())

            cursor.execute(
                """
                INSERT INTO areas_conhecimento (grande_area, area, sub_area, especialidade)
                VALUES (%s, 'Computacao', 'Testes Automatizados', NULL)
                RETURNING id, grande_area, area, sub_area;
                """,
                (f"{prefix} Ciencias Exatas",),
            )
            data["area"] = dict(cursor.fetchone())

            cursor.execute(
                """
                INSERT INTO pesquisadores (lattes_id, nome, resumo, instituicao_id)
                VALUES (%s, %s, 'Pesquisador usado apenas pela suite pytest.', %s)
                RETURNING id, lattes_id, nome, resumo;
                """,
                (lattes_id, f"{prefix} Pesquisador", data["instituicao"]["id"]),
            )
            data["pesquisador"] = dict(cursor.fetchone())

            cursor.execute(
                """
                INSERT INTO pesquisador_areas (pesquisador_id, area_id)
                VALUES (%s, %s);
                """,
                (data["pesquisador"]["id"], data["area"]["id"]),
            )

            cursor.execute(
                """
                INSERT INTO qualis_periodicos (issn, titulo, area_avaliacao, estrato)
                VALUES (%s, %s, 'Computacao', 'A1');
                """,
                (issn, f"{prefix} Periodico de Teste"),
            )

            cursor.execute(
                """
                INSERT INTO producoes (
                    pesquisador_id,
                    tipo_producao,
                    titulo,
                    ano,
                    idioma,
                    natureza,
                    doi,
                    revista,
                    evento,
                    issn
                )
                VALUES (%s, 'ARTIGO PUBLICADO', %s, 2024, 'Portugues', 'COMPLETO',
                        %s, %s, NULL, %s)
                RETURNING id, tipo_producao, titulo, ano, pesquisador_id;
                """,
                (
                    data["pesquisador"]["id"],
                    f"{prefix} pytermbusca aprendizagem profunda",
                    f"10.0000/{suffix}",
                    f"{prefix} Revista",
                    issn,
                ),
            )
            data["producao_textual"] = dict(cursor.fetchone())

            cursor.execute(
                """
                INSERT INTO producoes (
                    pesquisador_id,
                    tipo_producao,
                    titulo,
                    ano,
                    idioma,
                    natureza,
                    doi,
                    revista,
                    evento,
                    issn
                )
                VALUES (%s, 'TRABALHO EM EVENTOS', %s, 2023, 'Portugues', 'RESUMO',
                        %s, NULL, %s, NULL)
                RETURNING id, tipo_producao, titulo, ano, pesquisador_id;
                """,
                (
                    data["pesquisador"]["id"],
                    f"{prefix} semantica vetorial deterministica",
                    f"10.0000/{suffix}-evento",
                    f"{prefix} Evento",
                ),
            )
            data["producao_semantica"] = dict(cursor.fetchone())

            vector_size = 1536
            first_vector = [1.0] + [0.0] * (vector_size - 1)
            second_vector = [0.0, 1.0] + [0.0] * (vector_size - 2)
            cursor.execute(
                """
                INSERT INTO vetores (producao_id, embedding, modelo_embedding)
                VALUES (%s, %s::vector, 'pytest'),
                       (%s, %s::vector, 'pytest');
                """,
                (
                    data["producao_semantica"]["id"],
                    _vector_literal(first_vector),
                    data["producao_textual"]["id"],
                    _vector_literal(second_vector),
                ),
            )

        db_conn.commit()
        yield data
    finally:
        db_conn.rollback()
        with db_conn.cursor() as cursor:
            cursor.execute(
                """
                DELETE FROM pesquisadores
                WHERE lattes_id = %s;
                """,
                (lattes_id,),
            )
            cursor.execute(
                """
                DELETE FROM instituicoes
                WHERE nome LIKE %s;
                """,
                (f"{prefix}%",),
            )
            cursor.execute(
                """
                DELETE FROM areas_conhecimento
                WHERE grande_area LIKE %s;
                """,
                (f"{prefix}%",),
            )
            cursor.execute(
                """
                DELETE FROM qualis_periodicos
                WHERE issn = %s;
                """,
                (issn,),
            )
        db_conn.commit()
