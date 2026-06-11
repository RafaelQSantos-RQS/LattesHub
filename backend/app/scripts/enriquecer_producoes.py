"""
Enriches producoes with fields not captured by the Apache Hop ETL:
volume, fasciculo, pagina_inicial, pagina_final, pais_publicacao,
titulo_ingles, palavras_chave, coautores.

Reads Lattes XML files from DATA_DIR and updates matching rows in the database.
Matching key: (pesquisadores.lattes_id, producoes.titulo) — same key the ETL uses.
"""
import glob
import logging
import os
import re
import xml.etree.ElementTree as ET

import psycopg2
from dotenv import load_dotenv

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

DATA_DIR = os.getenv("DATA_DIR", "/data/lattes")

_WHITESPACE_RE = re.compile(r"[\r\n\t]+")


def _attr(el, name):
    """Return a stripped attribute value, or None if absent/empty."""
    val = (el.get(name) or "").strip()
    return val if val else None


def _join(values, sep="; "):
    """Join non-empty strings with sep, return None if nothing."""
    parts = [v.strip() for v in values if v and v.strip()]
    return sep.join(parts) if parts else None


def _normalize_titulo(titulo):
    """Apply the same whitespace normalization the ETL does."""
    return _WHITESPACE_RE.sub(" ", titulo).strip() if titulo else titulo


def extract_articles(xml_path):
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except ET.ParseError as exc:
        logger.warning("Skipping %s — parse error: %s", xml_path, exc)
        return []

    lattes_id = (root.get("NUMERO-IDENTIFICADOR") or "").strip()
    if not lattes_id:
        return []

    articles = []
    for artigo in root.findall(".//ARTIGO-PUBLICADO"):
        dados = artigo.find("DADOS-BASICOS-DO-ARTIGO")
        if dados is None:
            continue
        titulo = _attr(dados, "TITULO-DO-ARTIGO")
        if not titulo:
            continue

        det = artigo.find("DETALHAMENTO-DO-ARTIGO")

        volume = _attr(det, "VOLUME") if det is not None else None
        fasciculo = _attr(det, "FASCICULO") if det is not None else None
        pagina_inicial = _attr(det, "PAGINA-INICIAL") if det is not None else None
        pagina_final = _attr(det, "PAGINA-FINAL") if det is not None else None
        pais_publicacao = _attr(dados, "PAIS-DE-PUBLICACAO")
        titulo_ingles = _attr(dados, "TITULO-DO-ARTIGO-INGLES")

        pk_el = artigo.find("PALAVRAS-CHAVE")
        if pk_el is not None:
            palavras_chave = _join(
                [_attr(pk_el, f"PALAVRA-CHAVE-{i}") or "" for i in range(1, 7)]
            )
        else:
            palavras_chave = None

        autores_els = artigo.findall("AUTORES")
        autores_sorted = sorted(
            autores_els,
            key=lambda a: int((a.get("ORDEM-DE-AUTORIA") or "99").strip() or "99"),
        )
        coautores = _join([_attr(a, "NOME-PARA-CITACAO") or "" for a in autores_sorted])

        articles.append(
            {
                "lattes_id": lattes_id,
                "titulo": _normalize_titulo(titulo),
                "volume": volume,
                "fasciculo": fasciculo,
                "pagina_inicial": pagina_inicial,
                "pagina_final": pagina_final,
                "pais_publicacao": pais_publicacao,
                "titulo_ingles": titulo_ingles,
                "palavras_chave": palavras_chave,
                "coautores": coautores,
            }
        )

    return articles


def main():
    xml_files = glob.glob(os.path.join(DATA_DIR, "*.xml"))
    logger.info("Found %d XML files in %s", len(xml_files), DATA_DIR)

    all_articles = []
    for path in xml_files:
        all_articles.extend(extract_articles(path))
    logger.info("Extracted %d articles total", len(all_articles))

    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )
    cur = conn.cursor()

    updated = 0
    skipped = 0
    for art in all_articles:
        cur.execute(
            """
            UPDATE producoes p
            SET
                volume          = %(volume)s,
                fasciculo       = %(fasciculo)s,
                pagina_inicial  = %(pagina_inicial)s,
                pagina_final    = %(pagina_final)s,
                pais_publicacao = %(pais_publicacao)s,
                titulo_ingles   = NULLIF(%(titulo_ingles)s, ''),
                palavras_chave  = %(palavras_chave)s,
                coautores       = %(coautores)s
            WHERE p.titulo = %(titulo)s
              AND p.pesquisador_id = (
                  SELECT id FROM pesquisadores
                  WHERE lattes_id = %(lattes_id)s
                  LIMIT 1
              )
            """,
            art,
        )
        if cur.rowcount:
            updated += cur.rowcount
        else:
            skipped += 1

    conn.commit()
    cur.close()
    conn.close()
    logger.info("Done — updated %d rows, skipped %d unmatched", updated, skipped)


if __name__ == "__main__":
    main()
