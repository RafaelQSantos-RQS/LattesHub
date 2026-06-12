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

        cursor.execute("""
            SELECT tipo_producao AS tipo, COUNT(*) AS total
            FROM producoes
            GROUP BY tipo_producao
            ORDER BY total DESC;
        """)
        por_tipo = cursor.fetchall()

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
