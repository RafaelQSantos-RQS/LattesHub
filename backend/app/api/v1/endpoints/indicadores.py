import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from app.core.database import get_db_connection
from app.core.errors import raise_internal_server_error

router = APIRouter()
logger = logging.getLogger(__name__)


class ProducaoPorAno(BaseModel):
    ano: int
    total: int


class TopArea(BaseModel):
    area: str
    total: int


class ProducaoPorTipo(BaseModel):
    tipo: str
    total: int


class QualisEstrato(BaseModel):
    estrato: str
    total: int


class TopInstituicao(BaseModel):
    instituicao: str
    total: int


class IndicadoresResumo(BaseModel):
    total_producoes: int
    total_pesquisadores: int
    producoes_por_ano: list[ProducaoPorAno]
    top_areas: list[TopArea]
    por_tipo: list[ProducaoPorTipo]
    qualis_distribuicao: list[QualisEstrato]
    top_instituicoes: list[TopInstituicao]


class FiltroOpcoes(BaseModel):
    grandes_areas: list[str]
    instituicoes: list[str]
    tipos_producao: list[str]
    anos: list[int]


def _build_ids_subquery(
    ano_inicio: Optional[int],
    ano_fim: Optional[int],
    grande_area: Optional[list[str]],
    instituicao: Optional[list[str]],
    tipo_producao: Optional[str],
    qualis: Optional[list[str]],
) -> tuple[str, list]:
    """Returns (sql_subquery, params) selecting DISTINCT producao IDs matching all filters."""
    joins: list[str] = []
    conditions: list[str] = []
    params: list = []
    grande_area_values = _filled_values(grande_area)
    instituicao_values = _filled_values(instituicao)
    qualis_values = _filled_values(qualis)

    needs_pes = bool(grande_area_values or instituicao_values)

    if needs_pes:
        joins.append("JOIN pesquisadores pes ON p.pesquisador_id = pes.id")
    if grande_area_values:
        joins.append("JOIN pesquisador_areas pa ON pa.pesquisador_id = pes.id")
        joins.append("JOIN areas_conhecimento ac ON ac.id = pa.area_id")
        conditions.append("ac.grande_area = ANY(%s)")
        params.append(grande_area_values)
    if instituicao_values:
        joins.append("JOIN instituicoes i ON pes.instituicao_id = i.id")
        conditions.append("i.nome = ANY(%s)")
        params.append(instituicao_values)
    if qualis_values:
        joins.append(
            "LEFT JOIN qualis_periodicos q ON p.issn = q.issn"
            if "Sem Qualis" in qualis_values
            else "JOIN qualis_periodicos q ON p.issn = q.issn"
        )
        qualis_condition, qualis_params = _qualis_filter_condition("q.estrato", qualis_values)
        conditions.append(qualis_condition)
        params.extend(qualis_params)
    if tipo_producao:
        conditions.append("p.tipo_producao = %s")
        params.append(tipo_producao)
    if ano_inicio is not None:
        conditions.append("p.ano >= %s")
        params.append(ano_inicio)
    if ano_fim is not None:
        conditions.append("p.ano <= %s")
        params.append(ano_fim)

    joins_sql = " ".join(joins)
    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    return f"SELECT DISTINCT p.id FROM producoes p {joins_sql} {where_sql}", params


def _filled_values(values: Optional[list[str]]) -> list[str]:
    if not values:
        return []
    return [value.strip() for value in values if value and value.strip()]


def _qualis_filter_condition(column: str, qualis_values: list[str]) -> tuple[str, list]:
    include_sem_qualis = "Sem Qualis" in qualis_values
    estratos = [value for value in qualis_values if value != "Sem Qualis"]

    if include_sem_qualis and estratos:
        return f"({column} = ANY(%s) OR {column} IS NULL)", [estratos]
    if include_sem_qualis:
        return f"{column} IS NULL", []
    return f"{column} = ANY(%s)", [estratos]


@router.get("/resumo", response_model=IndicadoresResumo)
def obter_resumo_indicadores(
    db=Depends(get_db_connection),
    ano_inicio: Optional[int] = Query(default=None),
    ano_fim: Optional[int] = Query(default=None),
    grande_area: Optional[list[str]] = Query(default=None),
    instituicao: Optional[list[str]] = Query(default=None),
    tipo_producao: Optional[str] = Query(default=None),
    qualis: Optional[list[str]] = Query(default=None),
):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        grande_area = _filled_values(grande_area)
        instituicao = _filled_values(instituicao)
        qualis = _filled_values(qualis)

        has_filters = any([ano_inicio, ano_fim, grande_area, instituicao, tipo_producao, qualis])

        if has_filters:
            ids_sql, ids_params = _build_ids_subquery(
                ano_inicio, ano_fim, grande_area, instituicao, tipo_producao, qualis
            )
            in_filter = f"p.id IN ({ids_sql})"

        # ── Total de produções ──────────────────────────────────────────────
        if has_filters:
            cursor.execute(
                f"SELECT COUNT(*) AS total FROM producoes p WHERE {in_filter};",
                ids_params,
            )
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM producoes;")
        total_producoes = cursor.fetchone()["total"]

        # ── Total de pesquisadores ──────────────────────────────────────────
        if has_filters:
            cursor.execute(
                f"SELECT COUNT(DISTINCT p.pesquisador_id) AS total FROM producoes p WHERE {in_filter};",
                ids_params,
            )
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM pesquisadores;")
        total_pesquisadores = cursor.fetchone()["total"]

        # ── Produções por ano ───────────────────────────────────────────────
        if has_filters:
            cursor.execute(
                f"""
                SELECT p.ano AS ano, COUNT(*) AS total
                FROM producoes p
                WHERE p.ano IS NOT NULL AND {in_filter}
                GROUP BY p.ano
                ORDER BY p.ano ASC;
                """,
                ids_params,
            )
        else:
            cursor.execute("""
                SELECT ano, COUNT(*) AS total
                FROM producoes
                WHERE ano IS NOT NULL
                GROUP BY ano
                ORDER BY ano ASC;
            """)
        producoes_por_ano = cursor.fetchall()

        # ── Top áreas ───────────────────────────────────────────────────────
        if has_filters:
            area_filter_sql = "AND ac.grande_area = ANY(%s)" if grande_area else ""
            area_params = ids_params + ([grande_area] if grande_area else [])
            cursor.execute(
                f"""
                SELECT ac.grande_area AS area, COUNT(DISTINCT p.id) AS total
                FROM producoes p
                JOIN pesquisadores pes ON p.pesquisador_id = pes.id
                JOIN pesquisador_areas pa ON pa.pesquisador_id = pes.id
                JOIN areas_conhecimento ac ON ac.id = pa.area_id
                WHERE ac.grande_area IS NOT NULL AND {in_filter}
                {area_filter_sql}
                GROUP BY ac.grande_area
                ORDER BY total DESC
                LIMIT 5;
                """,
                area_params,
            )
        else:
            cursor.execute("""
                SELECT ac.grande_area AS area, COUNT(DISTINCT p.id) AS total
                FROM producoes p
                JOIN pesquisadores pes ON p.pesquisador_id = pes.id
                JOIN pesquisador_areas pa ON pa.pesquisador_id = pes.id
                JOIN areas_conhecimento ac ON ac.id = pa.area_id
                WHERE ac.grande_area IS NOT NULL
                GROUP BY ac.grande_area
                ORDER BY total DESC
                LIMIT 5;
            """)
        top_areas = cursor.fetchall()

        # ── Por tipo ────────────────────────────────────────────────────────
        if has_filters:
            cursor.execute(
                f"""
                SELECT p.tipo_producao AS tipo, COUNT(*) AS total
                FROM producoes p
                WHERE {in_filter}
                GROUP BY p.tipo_producao
                ORDER BY total DESC;
                """,
                ids_params,
            )
        else:
            cursor.execute("""
                SELECT tipo_producao AS tipo, COUNT(*) AS total
                FROM producoes
                GROUP BY tipo_producao
                ORDER BY total DESC;
            """)
        por_tipo = cursor.fetchall()

        # ── Distribuição Qualis ─────────────────────────────────────────────
        if has_filters:
            qualis_filter_sql = ""
            qualis_params = ids_params
            if qualis:
                qualis_condition, external_qualis_params = _qualis_filter_condition("q.estrato", qualis)
                qualis_filter_sql = f"AND {qualis_condition}"
                qualis_params = ids_params + external_qualis_params
            cursor.execute(
                f"""
                SELECT
                    COALESCE(q.estrato, 'Sem Qualis') AS estrato,
                    COUNT(DISTINCT p.id) AS total
                FROM producoes p
                LEFT JOIN qualis_periodicos q ON p.issn = q.issn
                WHERE {in_filter}
                {qualis_filter_sql}
                GROUP BY COALESCE(q.estrato, 'Sem Qualis')
                ORDER BY CASE COALESCE(q.estrato, 'Sem Qualis')
                    WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'A3' THEN 3 WHEN 'A4' THEN 4
                    WHEN 'B1' THEN 5 WHEN 'B2' THEN 6 WHEN 'B3' THEN 7 WHEN 'B4' THEN 8
                    WHEN 'C'  THEN 9 ELSE 10
                END;
                """,
                qualis_params,
            )
        else:
            cursor.execute("""
                SELECT
                    COALESCE(q.estrato, 'Sem Qualis') AS estrato,
                    COUNT(DISTINCT p.id) AS total
                FROM producoes p
                LEFT JOIN qualis_periodicos q ON p.issn = q.issn
                GROUP BY COALESCE(q.estrato, 'Sem Qualis')
                ORDER BY CASE COALESCE(q.estrato, 'Sem Qualis')
                    WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'A3' THEN 3 WHEN 'A4' THEN 4
                    WHEN 'B1' THEN 5 WHEN 'B2' THEN 6 WHEN 'B3' THEN 7 WHEN 'B4' THEN 8
                    WHEN 'C'  THEN 9 ELSE 10
                END;
            """)
        qualis_distribuicao = cursor.fetchall()

        # ── Top instituições ────────────────────────────────────────────────
        if has_filters:
            instituicao_filter_sql = "AND i.nome = ANY(%s)" if instituicao else ""
            instituicao_params = ids_params + ([instituicao] if instituicao else [])
            cursor.execute(
                f"""
                SELECT i.nome AS instituicao, COUNT(DISTINCT p.id) AS total
                FROM producoes p
                JOIN pesquisadores pes ON p.pesquisador_id = pes.id
                JOIN instituicoes i ON pes.instituicao_id = i.id
                WHERE {in_filter}
                {instituicao_filter_sql}
                GROUP BY i.nome
                ORDER BY total DESC
                LIMIT 5;
                """,
                instituicao_params,
            )
        else:
            cursor.execute("""
                SELECT i.nome AS instituicao, COUNT(DISTINCT p.id) AS total
                FROM producoes p
                JOIN pesquisadores pes ON p.pesquisador_id = pes.id
                JOIN instituicoes i ON pes.instituicao_id = i.id
                GROUP BY i.nome
                ORDER BY total DESC
                LIMIT 5;
            """)
        top_instituicoes = cursor.fetchall()

        cursor.close()

        return {
            "total_producoes": total_producoes,
            "total_pesquisadores": total_pesquisadores,
            "producoes_por_ano": list(producoes_por_ano),
            "top_areas": list(top_areas),
            "por_tipo": list(por_tipo),
            "qualis_distribuicao": list(qualis_distribuicao),
            "top_instituicoes": list(top_instituicoes),
        }

    except Exception as e:
        raise_internal_server_error(logger, "Erro ao obter resumo de indicadores", e)


@router.get("/filtros", response_model=FiltroOpcoes)
def obter_opcoes_filtro(db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        cursor.execute("""
            SELECT DISTINCT grande_area FROM areas_conhecimento
            WHERE grande_area IS NOT NULL
            ORDER BY grande_area ASC;
        """)
        grandes_areas = [r["grande_area"] for r in cursor.fetchall()]

        cursor.execute("SELECT DISTINCT nome FROM instituicoes ORDER BY nome ASC;")
        instituicoes = [r["nome"] for r in cursor.fetchall()]

        cursor.execute("""
            SELECT DISTINCT tipo_producao FROM producoes
            WHERE tipo_producao IS NOT NULL
            ORDER BY tipo_producao ASC;
        """)
        tipos_producao = [r["tipo_producao"] for r in cursor.fetchall()]

        cursor.execute("""
            SELECT DISTINCT ano FROM producoes
            WHERE ano IS NOT NULL
            ORDER BY ano ASC;
        """)
        anos = [r["ano"] for r in cursor.fetchall()]

        cursor.close()

        return {
            "grandes_areas": grandes_areas,
            "instituicoes": instituicoes,
            "tipos_producao": tipos_producao,
            "anos": anos,
        }

    except Exception as e:
        raise_internal_server_error(logger, "Erro ao obter opções de filtro", e)
