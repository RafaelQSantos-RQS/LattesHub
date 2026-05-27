from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.schemas.instituicao import (
    InstituicaoResumo,
    InstituicaoListResponse,
    InstituicaoPesquisadoresResponse,
    InstituicaoProducoesResponse,
)
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor

router = APIRouter()


@router.get("/", response_model=InstituicaoListResponse)
def listar_instituicoes(
    pagina: int = Query(1, ge=1, description="Número da página"),
    tamanho_pagina: int = Query(
        20, ge=1, le=100, description="Quantidade de registros por página"
    ),
    # NOVO: Parâmetro opcional para receber a lista de IDs de subáreas marcadas no front-end
    areas: Optional[list[int]] = Query(
        None,
        description="Filtra instituições que possuem pesquisadores nas áreas informadas",
    ),
    db=Depends(get_db_connection),
):
    offset = (pagina - 1) * tamanho_pagina

    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        where_clause = ""
        parametros_sql = []

        # Se o usuário selecionou alguma área, filtramos as instituições dinamicamente
        if areas:
            where_clause = """
                WHERE EXISTS (
                    SELECT 1 
                    FROM pesquisadores p
                    JOIN pesquisador_areas pa ON p.id = pa.pesquisador_id
                    WHERE p.instituicao_id = i.id AND pa.area_id = ANY(%s)
                )
            """
            parametros_sql.append(areas)

        # 1. Conta o total de instituições aplicando a regra de filtragem (garante metadados de paginação íntegros)
        sql_count = f"SELECT COUNT(i.id) as total FROM instituicoes i {where_clause};"
        cursor.execute(sql_count, tuple(parametros_sql))
        total_registros = cursor.fetchone()["total"]

        # 2. Busca as colunas da instituição usando o apelido 'i' sincronizado com o WHERE EXISTS
        sql = f"""
            SELECT 
                i.id, 
                i.nome, 
                i.cidade, 
                i.estado, 
                i.pais
            FROM instituicoes i
            {where_clause}
            ORDER BY i.nome ASC
            LIMIT %s OFFSET %s;
        """

        # Concatena a lista de áreas com os limitadores de paginação
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
            status_code=500, detail=f"Erro ao listar instituições: {str(e)}"
        )


@router.get("/{instituicao_id}", response_model=InstituicaoResumo)
def obter_instituicao_por_id(instituicao_id: int, db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        sql = """
            SELECT 
                id, 
                nome, 
                cidade, 
                estado, 
                pais
            FROM instituicoes
            WHERE id = %s;
        """
        cursor.execute(sql, (instituicao_id,))
        instituicao = cursor.fetchone()
        cursor.close()

        # Se o banco não retornar nada, devolvemos o erro 404 limpo para o front-end
        if not instituicao:
            raise HTTPException(status_code=404, detail="Instituição não encontrada.")

        return instituicao

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro ao buscar detalhes da instituição: {str(e)}"
        )

@router.get("/{instituicao_id}/producoes", response_model=InstituicaoProducoesResponse)
def listar_producoes_por_instituicao(
    instituicao_id: int,
    pagina: int = Query(1, ge=1, description="Número da página"),
    tamanho_pagina: int = Query(20, ge=1, le=100, description="Quantidade de registros por página"),
    db = Depends(get_db_connection)
):
    offset = (pagina - 1) * tamanho_pagina
    
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        
        # 1. Valida a instituição
        cursor.execute(
            "SELECT id, nome, cidade, estado, pais FROM instituicoes WHERE id = %s;", 
            (instituicao_id,)
        )
        dados_instituicao = cursor.fetchone()
        
        if not dados_instituicao:
            raise HTTPException(status_code=404, detail="Instituição não encontrada.")
            
        # 2. Conta o total de produções vinculadas a pesquisadores desta instituição
        sql_count = """
            SELECT COUNT(prod.id) as total 
            FROM producoes prod
            JOIN pesquisadores pes ON prod.pesquisador_id = pes.id
            WHERE pes.instituicao_id = %s;
        """
        cursor.execute(sql_count, (instituicao_id,))
        total_registros = cursor.fetchone()['total']
        
        # 3. Busca a lista paginada de produções com os dados do autor
        sql_producoes = """
            SELECT 
                prod.id, 
                prod.tipo_producao, 
                prod.titulo, 
                prod.ano,
                pes.id AS pesquisador_id,
                pes.nome AS pesquisador_nome
            FROM producoes prod
            JOIN pesquisadores pes ON prod.pesquisador_id = pes.id
            WHERE pes.instituicao_id = %s
            ORDER BY prod.ano DESC NULLS LAST, prod.titulo ASC
            LIMIT %s OFFSET %s;
        """
        cursor.execute(sql_producoes, (instituicao_id, tamanho_pagina, offset))
        lista_producoes = cursor.fetchall()
        
        cursor.close()
        
        return {
            "instituicao": dados_instituicao,
            "total": total_registros,
            "pagina": pagina,
            "tamanho_pagina": tamanho_pagina,
            "resultados": lista_producoes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao listar produções da instituição: {str(e)}")
