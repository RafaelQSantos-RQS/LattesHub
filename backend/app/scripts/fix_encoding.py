"""
One-time migration: fix CP437-as-UTF8 double-encoding in text columns.

Root cause: Apache Hop read Lattes XML bytes as CP437 (each raw UTF-8 byte was
mapped to its CP437 Unicode equivalent) before inserting into PostgreSQL. This
left Portuguese characters stored as sequences of box-drawing/Latin characters
instead of the correct accented letters.

Fix: encode each stored string back to CP437 bytes, then decode as UTF-8.
Safe: strings that are already correct ASCII pass through unchanged; strings
with Unicode chars that have no CP437 equivalent are left unchanged.
"""

import logging
import os
import sys

import psycopg2
import psycopg2.extras

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

TABLES = {
    "instituicoes": ["nome", "cidade"],
    "areas_conhecimento": ["grande_area", "area", "sub_area", "especialidade"],
    "pesquisadores": ["nome", "nome_citacao", "nacionalidade", "pais_nascimento", "resumo", "resumo_ingles"],
    "producoes": [
        "tipo_producao", "titulo", "idioma", "natureza",
        "revista", "evento", "pais_publicacao", "titulo_ingles",
        "palavras_chave", "coautores",
    ],
}


def fix(value: str) -> str:
    """Reverse CP437-per-byte → UTF-8 double-encoding."""
    if value is None:
        return None
    try:
        return value.encode("cp437").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return value


def connect():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        sslmode = os.getenv("DB_SSLMODE", "require")
        return psycopg2.connect(dsn=database_url, sslmode=sslmode)
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "db"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        sslmode=os.getenv("DB_SSLMODE", "disable"),
    )


def run(dry_run: bool = False):
    conn = connect()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    total_fixed = 0

    for table, columns in TABLES.items():
        col_list = ", ".join(["id"] + columns)
        cur.execute(f"SELECT {col_list} FROM {table};")
        rows = cur.fetchall()

        updates = []
        for row in rows:
            new_vals = {}
            for col in columns:
                original = row[col]
                fixed = fix(original)
                if fixed != original:
                    new_vals[col] = fixed
            if new_vals:
                updates.append((row["id"], new_vals))

        if not updates:
            log.info("%s: nothing to fix", table)
            continue

        log.info("%s: %d rows to update%s", table, len(updates), " (DRY RUN)" if dry_run else "")

        if not dry_run:
            for row_id, new_vals in updates:
                set_clause = ", ".join(f"{col} = %s" for col in new_vals)
                values = list(new_vals.values()) + [row_id]
                cur.execute(f"UPDATE {table} SET {set_clause} WHERE id = %s;", values)

        total_fixed += len(updates)

    if dry_run:
        conn.rollback()
        log.info("\nDRY RUN complete — %d rows would be updated. Run with --apply to commit.", total_fixed)
    else:
        conn.commit()
        log.info("\nDone — %d rows updated.", total_fixed)

    cur.close()
    conn.close()


if __name__ == "__main__":
    dry_run = "--apply" not in sys.argv
    run(dry_run=dry_run)
