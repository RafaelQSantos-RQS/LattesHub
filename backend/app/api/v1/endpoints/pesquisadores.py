from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.schemas.pesquisador import (
    PesquisadorListResponse,
    PesquisadorPerfilResponse,
    PesquisadorResumo,
)
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

router = APIRouter()


def buscar_areas_pesquisador(cursor, pesquisador_id: int):
    sql = """
        SELECT
            ac.id,
            ac.grande_area,
            ac.area,
            ac.sub_area,
            ac.especialidade
        FROM pesquisador_areas pa
        JOIN areas_conhecimento ac ON ac.id = pa.area_id
        WHERE pa.pesquisador_id = %s
        ORDER BY ac.grande_area ASC, ac.area ASC, ac.sub_area ASC NULLS LAST;
    """
    cursor.execute(sql, (pesquisador_id,))
    return cursor.fetchall()


@router.get("/", response_model=PesquisadorListResponse)
def listar_pesquisadores(
    pagina: int = Query(1, ge=1, description="Número da página"),
    tamanho_pagina: int = Query(
        20, ge=1, le=100, description="Quantidade de registros por página"
    ),
    areas: Optional[list[int]] = Query(
        None, description="Filtra por múltiplos IDs de áreas de conhecimento"
    ),
    # NOVO: Filtro para a tela global exibir apenas pesquisadores de uma instituição específica
    instituicao_id: Optional[int] = Query(
        None, description="Filtra pesquisadores por instituição"
    ),
    db=Depends(get_db_connection),
):
    offset = (pagina - 1) * tamanho_pagina

    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        filtros = []
        parametros_sql = []

        # 1. Filtro Global por Instituição
        if instituicao_id:
            filtros.append("p.instituicao_id = %s")
            parametros_sql.append(instituicao_id)

        # 2. Filtro Global por Áreas (Checkbox)
        if areas:
            filtros.append("""
                EXISTS (
                    SELECT 1 FROM pesquisador_areas pa 
                    WHERE pa.pesquisador_id = p.id AND pa.area_id = ANY(%s)
                )
            """)
            parametros_sql.append(areas)

        # Concatena todos os filtros usando AND
        where_clause = " WHERE " + " AND ".join(filtros) if filtros else ""

        # Conta o total absoluto aplicando os filtros acumulados
        cursor.execute(
            f"SELECT COUNT(p.id) as total FROM pesquisadores p {where_clause};",
            tuple(parametros_sql),
        )
        total_registros = cursor.fetchone()["total"]

        # Busca os pesquisadores paginados
        sql = f"""
            SELECT 
                p.id, 
                p.lattes_id, 
                p.nome, 
                p.resumo, 
                i.nome AS instituicao_nome
            FROM pesquisadores p
            LEFT JOIN instituicoes i ON p.instituicao_id = i.id
            {where_clause}
            ORDER BY p.nome ASC
            LIMIT %s OFFSET %s;
        """

        parametros_query = list(parametros_sql) + [tamanho_pagina, offset]

        cursor.execute(sql, tuple(parametros_query))
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
            status_code=500, detail=f"Erro ao listar pesquisadores: {str(e)}"
        )

@router.get("/{pesquisador_id}", response_model=PesquisadorResumo)
def obter_pesquisador_por_id(pesquisador_id: int, db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # Fazemos o LEFT JOIN para garantir que o nome da instituição venha junto
        sql = """
            SELECT 
                p.id, 
                p.lattes_id, 
                p.nome, 
                p.resumo, 
                i.nome AS instituicao_nome
            FROM pesquisadores p
            LEFT JOIN instituicoes i ON p.instituicao_id = i.id
            WHERE p.id = %s;
        """
        cursor.execute(sql, (pesquisador_id,))
        pesquisador = cursor.fetchone()

        # Proteção contra IDs inexistentes
        if not pesquisador:
            cursor.close()
            raise HTTPException(status_code=404, detail="Pesquisador não encontrado.")

        pesquisador["areas"] = buscar_areas_pesquisador(cursor, pesquisador_id)
        cursor.close()

        return pesquisador

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar detalhes do pesquisador: {str(e)}"
        )

@router.get("/{pesquisador_id}/producoes", response_model=PesquisadorPerfilResponse)
def obter_producoes_pesquisador(pesquisador_id: int, db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # 1. Busca os dados de perfil do Pesquisador
        sql_pesquisador = """
            SELECT 
                p.id, 
                p.lattes_id, 
                p.nome, 
                p.resumo, 
                i.nome AS instituicao_nome
            FROM pesquisadores p
            LEFT JOIN instituicoes i ON p.instituicao_id = i.id
            WHERE p.id = %s;
        """
        cursor.execute(sql_pesquisador, (pesquisador_id,))
        dados_pesquisador = cursor.fetchone()

        if not dados_pesquisador:
            cursor.close()
            raise HTTPException(status_code=404, detail="Pesquisador não encontrado.")

        # 2. Busca o histórico cronológico de produções científicas
        dados_pesquisador["areas"] = buscar_areas_pesquisador(cursor, pesquisador_id)

        sql_producoes = """
            SELECT 
                id, 
                tipo_producao, 
                titulo, 
                ano, 
                natureza, 
                revista, 
                evento, 
                doi
            FROM producoes
            WHERE pesquisador_id = %s
            ORDER BY ano DESC NULLS LAST, titulo ASC;
        """
        cursor.execute(sql_producoes, (pesquisador_id,))
        lista_producoes = cursor.fetchall()

        cursor.close()

        return {"pesquisador": dados_pesquisador, "producoes": lista_producoes}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar currículo: {str(e)}"
        )
