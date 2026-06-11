import logging

from fastapi import APIRouter, Depends, HTTPException
from app.schemas.area import GrandeAreaFiltro
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[GrandeAreaFiltro])
def listar_areas_agrupadas(db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        # Adicionamos a sub_area no SELECT
        cursor.execute("""
            SELECT id, grande_area, area, sub_area 
            FROM areas_conhecimento 
            ORDER BY grande_area, area, sub_area ASC;
        """)
        linhas = cursor.fetchall()
        cursor.close()

        arvore = {}

        for linha in linhas:
            ga = linha["grande_area"]
            ar = linha["area"]

            # Tratamento: se a sub_area for nula no banco, chamamos de "Geral"
            sub_nome = linha["sub_area"] if linha["sub_area"] else "Geral"
            _id = linha["id"]

            if ga not in arvore:
                arvore[ga] = {}

            if ar not in arvore[ga]:
                arvore[ga][ar] = []

            # Em vez de apenas o ID, adicionamos o objeto completo
            arvore[ga][ar].append({"id": _id, "nome": sub_nome})

        resultado_final = []
        for ga, areas_dit in arvore.items():
            lista_areas = [
                {"nome": nome_area, "subareas": lista_subs}
                for nome_area, lista_subs in areas_dit.items()
            ]
            resultado_final.append({"grande_area": ga, "areas": lista_areas})

        return resultado_final

    except Exception as e:
        logger.error(f"Erro ao agrupar áreas: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno no servidor ao processar a requisição.",
        )
