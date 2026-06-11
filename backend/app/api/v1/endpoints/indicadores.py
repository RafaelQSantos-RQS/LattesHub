import logging
from fastapi import APIRouter, Depends
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


class IndicadoresResumo(BaseModel):
    total_producoes: int
    total_pesquisadores: int
    producoes_por_ano: list[ProducaoPorAno]
    top_areas: list[TopArea]


@router.get("/resumo", response_model=IndicadoresResumo)
def obter_resumo_indicadores(db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT COUNT(*) AS total FROM producoes;")
        total_producoes = cursor.fetchone()["total"]

        cursor.execute("SELECT COUNT(*) AS total FROM pesquisadores;")
        total_pesquisadores = cursor.fetchone()["total"]

        cursor.execute("""
            SELECT ano, COUNT(*) AS total
            FROM producoes
            WHERE ano IS NOT NULL
            GROUP BY ano
            ORDER BY ano ASC;
        """)
        producoes_por_ano = cursor.fetchall()

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
        cursor.close()

        return {
            "total_producoes": total_producoes,
            "total_pesquisadores": total_pesquisadores,
            "producoes_por_ano": list(producoes_por_ano),
            "top_areas": list(top_areas),
        }

    except Exception as e:
        raise_internal_server_error(logger, "Erro ao obter resumo de indicadores", e)
