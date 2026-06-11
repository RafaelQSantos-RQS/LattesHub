import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from app.schemas.producao import ProducaoListResponse, ProducaoDetalhe
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor
from typing import Optional

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/", response_model=ProducaoListResponse)
def listar_todas_producoes(
    pagina: int = Query(1, ge=1, description="Número da página"),
    tamanho_pagina: int = Query(
        20, ge=1, le=100, description="Quantidade de registros por página"
    ),
    tipo_producao: Optional[str] = Query(
        None, description="Filtrar por tipo de produção (ex: ARTIGO PUBLICADO)"
    ),
    termo: Optional[str] = Query(
        None, min_length=2, description="Busca textual por título da produção"
    ),
    ano: Optional[int] = Query(None, description="Filtrar por ano específico"),
    areas: Optional[list[int]] = Query(
        None, description="Filtra produções por áreas de conhecimento do autor"
    ),
    # NOVO: Parâmetro opcional para filtrar a lista global por uma instituição específica
    instituicao_id: Optional[int] = Query(
        None, description="Filtrar produções de uma instituição específica"
    ),
    db=Depends(get_db_connection),
):
    offset = (pagina - 1) * tamanho_pagina

    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        filtros = []
        valores = []
        order_by = "p.ano DESC NULLS LAST, p.titulo ASC"

        # Construção dinâmica dos filtros acumulativos
        if tipo_producao:
            filtros.append("p.tipo_producao = %s")
            valores.append(tipo_producao)

        if termo:
            filtros.append("p.titulo_tsv @@ plainto_tsquery('portuguese_unaccent', %s)")
            valores.append(termo)
            order_by = (
                "ts_rank(p.titulo_tsv, plainto_tsquery('portuguese_unaccent', %s)) DESC, "
                "p.ano DESC NULLS LAST, p.titulo ASC"
            )

        if ano:
            filtros.append("p.ano = %s")
            valores.append(ano)

        if instituicao_id:
            # NOVO: Filtra usando o relacionamento já existente com o pesquisador autor
            filtros.append("pes.instituicao_id = %s")
            valores.append(instituicao_id)

        if areas:
            filtros.append("""
                EXISTS (
                    SELECT 1 FROM pesquisador_areas pa 
                    WHERE pa.pesquisador_id = p.pesquisador_id AND pa.area_id = ANY(%s)
                )
            """)
            valores.append(areas)

        where_clause = " WHERE " + " AND ".join(filtros) if filtros else ""

        # 1. Conta o total de registros aplicando todos os filtros (garante a paginação exata)
        sql_count = f"""
            SELECT COUNT(p.id) as total 
            FROM producoes p
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            {where_clause};
        """
        cursor.execute(sql_count, tuple(valores))
        total_registros = cursor.fetchone()["total"]

        # 2. Busca as produções paginadas
        sql_producoes = f"""
            SELECT 
                p.id, 
                p.tipo_producao, 
                p.titulo, 
                p.ano, 
                p.idioma, 
                p.natureza, 
                p.doi, 
                p.revista, 
                p.evento,
                p.pesquisador_id,
                pes.nome AS pesquisador_nome
            FROM producoes p
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            {where_clause}
            ORDER BY {order_by}
            LIMIT %s OFFSET %s;
        """

        valores_query = list(valores)
        if termo:
            valores_query.append(termo)
        valores_query.extend([tamanho_pagina, offset])
        cursor.execute(sql_producoes, tuple(valores_query))
        resultados = cursor.fetchall()

        cursor.close()

        return {
            "total": total_registros,
            "pagina": pagina,
            "tamanho_pagina": tamanho_pagina,
            "resultados": resultados,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro ao listar produções: {str(e)}"
        )


@router.get("/{producao_id}", response_model=ProducaoDetalhe)
def obter_producao_por_id(producao_id: int, db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # Query detalhada com JOIN para capturar o nome do pesquisador autor
        sql = """
            SELECT 
                p.id, 
                p.tipo_producao, 
                p.titulo, 
                p.ano, 
                p.idioma, 
                p.natureza, 
                p.doi, 
                p.revista, 
                p.evento,
                p.issn,
                p.pesquisador_id,
                pes.nome AS pesquisador_nome
            FROM producoes p
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            WHERE p.id = %s;
        """
        cursor.execute(sql, (producao_id,))
        producao = cursor.fetchone()
        cursor.close()

        # Caso o ID não exista no banco, retorna 404
        if not producao:
            raise HTTPException(
                status_code=404, detail="Produção científica não encontrada."
            )

        return producao

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Erro na operação de produções: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno no servidor ao processar a requisição.",
        )
