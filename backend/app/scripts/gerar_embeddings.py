import csv
import logging
import os
from pathlib import Path

import openai
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI
from pgvector.psycopg2 import register_vector
from psycopg2.extras import execute_values
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "lattes_hub")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))
DEFAULT_PRODUCTION_TYPES = (
    "ARTIGO PUBLICADO",
    "TRABALHO EM EVENTOS",
    "LIVRO PUBLICADO",
    "CAPITULO DE LIVRO",
)
DEFAULT_SEED_PATH = (
    Path(__file__).resolve().parents[3] / "database" / "seed" / "vetores_seed.csv"
)
SEED_PATH = Path(os.getenv("EMBEDDING_SEED_PATH", str(DEFAULT_SEED_PATH)))
USE_SEED = os.getenv("EMBEDDING_USE_SEED", "true").lower() not in {
    "0",
    "false",
    "no",
}
WRITE_SEED = os.getenv("EMBEDDING_WRITE_SEED", "true").lower() not in {
    "0",
    "false",
    "no",
}


def tipos_producao_elegiveis() -> list[str]:
    raw_types = os.getenv("EMBEDDING_PRODUCTION_TYPES")
    if not raw_types:
        return list(DEFAULT_PRODUCTION_TYPES)

    return [tipo.strip() for tipo in raw_types.split(",") if tipo.strip()]


def _valor_util(valor) -> str | None:
    if valor is None:
        return None

    texto = str(valor).strip()
    if not texto:
        return None

    if texto.upper() in {"NAO INFORMADO", "NÃO INFORMADO", "NAO SE APLICA", "NÃO SE APLICA"}:
        return None

    return texto


def montar_texto_embedding(producao: dict) -> str:
    campos = [
        ("Titulo", producao.get("titulo")),
        ("Resumo", producao.get("resumo")),
        ("Titulo em ingles", producao.get("titulo_ingles")),
        ("Tipo", producao.get("tipo_producao")),
        ("Natureza", producao.get("natureza")),
        ("Ano", producao.get("ano")),
        ("Idioma", producao.get("idioma")),
        ("Veiculo", producao.get("revista")),
        ("Evento", producao.get("evento")),
        ("Areas", producao.get("areas")),
        ("Palavras-chave", producao.get("palavras_chave")),
    ]
    partes = [
        f"{rotulo}: {texto}"
        for rotulo, valor in campos
        if (texto := _valor_util(valor)) is not None
    ]

    return ". ".join(partes) if partes else "Sem titulo"


def buscar_producoes_pendentes(cursor, tipos_producao: list[str]) -> list[dict]:
    cursor.execute(
        """
        SELECT
            p.id,
            p.tipo_producao,
            p.titulo,
            p.titulo_ingles,
            p.resumo,
            p.ano,
            p.idioma,
            p.natureza,
            p.revista,
            p.evento,
            p.palavras_chave,
            string_agg(
                DISTINCT NULLIF(
                    concat_ws(
                        ' / ',
                        NULLIF(a.grande_area, ''),
                        NULLIF(a.area, ''),
                        NULLIF(a.sub_area, ''),
                        NULLIF(a.especialidade, '')
                    ),
                    ''
                ),
                '; '
            ) AS areas
        FROM producoes p
        LEFT JOIN pesquisador_areas pa
          ON pa.pesquisador_id = p.pesquisador_id
        LEFT JOIN areas_conhecimento a
          ON a.id = pa.area_id
        LEFT JOIN vetores v
          ON v.producao_id = p.id
        WHERE p.tipo_producao = ANY(%s)
          AND p.titulo IS NOT NULL
          AND btrim(p.titulo) <> ''
          AND v.id IS NULL
        GROUP BY p.id
        ORDER BY p.id ASC;
        """,
        (tipos_producao,),
    )
    colunas = [desc[0] for desc in cursor.description]
    return [dict(zip(colunas, row)) for row in cursor.fetchall()]


def _openai_client() -> OpenAI:
    if not OPENAI_API_KEY:
        raise RuntimeError(
            "OPENAI_API_KEY nao configurada e ainda existem embeddings pendentes."
        )

    return OpenAI(api_key=OPENAI_API_KEY)


@retry(
    wait=wait_exponential(multiplier=1, min=2, max=20),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type((openai.RateLimitError, openai.APIConnectionError)),
    before_sleep=lambda retry_state: logger.warning(
        "Rate limit ou erro de rede. Tentando novamente em %ss...",
        retry_state.next_action.sleep,
    ),
)
def obter_embeddings_lote(textos: list[str]) -> list[list[float]]:
    response = _openai_client().embeddings.create(
        input=textos,
        model=EMBEDDING_MODEL,
    )
    return [d.embedding for d in response.data]


def conectar_banco():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def importar_seed(cursor) -> int:
    if not USE_SEED:
        logger.info("Importacao de seed de embeddings desabilitada.")
        return 0

    if not SEED_PATH.exists():
        logger.info("Seed de embeddings nao encontrado em %s.", SEED_PATH)
        return 0

    with SEED_PATH.open("r", encoding="utf-8", newline="") as seed_file:
        reader = csv.DictReader(seed_file)
        linhas = [
            (
                row["lattes_id"],
                row["tipo_producao"],
                row["titulo"],
                int(row["ano"]) if row["ano"] else None,
                row["embedding"],
                row["modelo_embedding"],
            )
            for row in reader
        ]

    if not linhas:
        logger.info("Seed de embeddings esta vazio em %s.", SEED_PATH)
        return 0

    cursor.execute(
        """
        CREATE TEMP TABLE tmp_vetores_seed (
            lattes_id TEXT NOT NULL,
            tipo_producao TEXT NOT NULL,
            titulo TEXT NOT NULL,
            ano INTEGER,
            embedding VECTOR(1536) NOT NULL,
            modelo_embedding TEXT NOT NULL
        ) ON COMMIT DROP;
        """
    )
    execute_values(
        cursor,
        """
        INSERT INTO tmp_vetores_seed (
            lattes_id,
            tipo_producao,
            titulo,
            ano,
            embedding,
            modelo_embedding
        )
        VALUES %s
        """,
        linhas,
        template="(%s, %s, %s, %s, %s::vector, %s)",
    )
    cursor.execute(
        """
        INSERT INTO vetores (producao_id, embedding, modelo_embedding)
        SELECT DISTINCT ON (p.id)
            p.id,
            s.embedding,
            s.modelo_embedding
        FROM tmp_vetores_seed s
        JOIN pesquisadores pes
          ON pes.lattes_id = s.lattes_id
        JOIN producoes p
          ON p.pesquisador_id = pes.id
         AND p.tipo_producao = s.tipo_producao
         AND p.titulo = s.titulo
         AND COALESCE(p.ano, -1) = COALESCE(s.ano, -1)
        LEFT JOIN vetores v
          ON v.producao_id = p.id
        WHERE v.id IS NULL
        ORDER BY p.id
        ON CONFLICT (producao_id) DO NOTHING;
        """
    )
    importados = cursor.rowcount
    logger.info("Seed de embeddings importado: %s novos vetores.", importados)
    return importados


def exportar_seed(cursor, tipos_producao: list[str]) -> int:
    if not WRITE_SEED:
        logger.info("Exportacao de seed de embeddings desabilitada.")
        return 0

    cursor.execute(
        """
        SELECT
            pes.lattes_id,
            p.tipo_producao,
            p.titulo,
            p.ano,
            v.embedding::text AS embedding,
            v.modelo_embedding
        FROM vetores v
        JOIN producoes p
          ON p.id = v.producao_id
        JOIN pesquisadores pes
          ON pes.id = p.pesquisador_id
        WHERE p.tipo_producao = ANY(%s)
        ORDER BY pes.lattes_id, p.tipo_producao, p.ano, p.titulo;
        """,
        (tipos_producao,),
    )
    linhas = cursor.fetchall()

    SEED_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SEED_PATH.open("w", encoding="utf-8", newline="") as seed_file:
        writer = csv.writer(seed_file)
        writer.writerow(
            [
                "lattes_id",
                "tipo_producao",
                "titulo",
                "ano",
                "embedding",
                "modelo_embedding",
            ]
        )
        writer.writerows(linhas)

    logger.info("Seed de embeddings exportado para %s (%s vetores).", SEED_PATH, len(linhas))
    return len(linhas)


def executar_carga_delta():
    logger.info("Iniciando processo de enriquecimento semantico.")

    conn = conectar_banco()
    register_vector(conn)
    cursor = conn.cursor()

    try:
        tipos_producao = tipos_producao_elegiveis()
        logger.info("Tipos de producao elegiveis: %s.", ", ".join(tipos_producao))

        importar_seed(cursor)
        conn.commit()

        producoes = buscar_producoes_pendentes(cursor, tipos_producao)

        total_pendente = len(producoes)
        logger.info("Encontradas %s producoes pendentes de processamento.", total_pendente)

        if total_pendente == 0:
            logger.info("Nenhuma producao pendente. Sistema atualizado.")
            exportar_seed(cursor, tipos_producao)
            conn.commit()
            return

        for i in range(0, total_pendente, BATCH_SIZE):
            lote = producoes[i : i + BATCH_SIZE]
            ids_lote = []
            textos_lote = []

            for producao in lote:
                ids_lote.append(producao["id"])
                textos_lote.append(montar_texto_embedding(producao))

            logger.info(
                "Processando lote %s (IDs %s ao %s)...",
                i // BATCH_SIZE + 1,
                ids_lote[0],
                ids_lote[-1],
            )

            embeddings_lote = obter_embeddings_lote(textos_lote)
            dados_insercao = [
                (prod_id, emb, EMBEDDING_MODEL)
                for prod_id, emb in zip(ids_lote, embeddings_lote)
            ]

            execute_values(
                cursor,
                """
                INSERT INTO vetores (producao_id, embedding, modelo_embedding)
                VALUES %s
                ON CONFLICT (producao_id) DO NOTHING
                """,
                dados_insercao,
            )
            conn.commit()

            logger.info("Lote %s gravado com sucesso (%s registros).", i // BATCH_SIZE + 1, len(lote))

        exportar_seed(cursor, tipos_producao)
        conn.commit()
        logger.info("Carga delta finalizada com sucesso.")

    except Exception as exc:
        conn.rollback()
        logger.error("Erro no processamento de embeddings: %s", exc, exc_info=True)
        raise
    finally:
        cursor.close()
        conn.close()
        logger.info("Conexao com o banco encerrada.")


if __name__ == "__main__":
    executar_carga_delta()
