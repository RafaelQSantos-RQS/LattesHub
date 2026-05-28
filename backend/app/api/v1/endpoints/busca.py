from fastapi import APIRouter, Depends, HTTPException
from app.schemas.buscas import BuscaSemanticaRequest, BuscaSemanticaResponse
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor
from openai import OpenAI
import os

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@router.post("/semantica", response_model=BuscaSemanticaResponse)
def busca_semantica(payload: BuscaSemanticaRequest, db=Depends(get_db_connection)):
    try:
        # 1. Converte a pergunta do usuário num vetor matemático via OpenAI
        response = client.embeddings.create(
            input=payload.pergunta,  # Certifique-se de que no schemas/busca.py a variável se chama 'pergunta'
            model="text-embedding-3-small",
        )
        vetor_query = response.data[0].embedding

        # 2. Executa a busca vetorial com filtros opcionais de negócio
        cursor = db.cursor(cursor_factory=RealDictCursor)

        filtros = []
        valores_filtros = []

        if payload.tipo_producao:
            filtros.append("p.tipo_producao = %s")
            valores_filtros.append(payload.tipo_producao)

        if payload.ano:
            filtros.append("p.ano = %s")
            valores_filtros.append(payload.ano)

        if payload.instituicao_id:
            filtros.append("pes.instituicao_id = %s")
            valores_filtros.append(payload.instituicao_id)

        if payload.areas:
            filtros.append("""
                EXISTS (
                    SELECT 1 FROM pesquisador_areas pa
                    WHERE pa.pesquisador_id = p.pesquisador_id
                    AND pa.area_id = ANY(%s)
                )
            """)
            valores_filtros.append(payload.areas)

        where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

        sql = f"""
        WITH ranked_producoes AS (
            SELECT 
                p.id, 
                p.titulo, 
                p.tipo_producao, 
                p.ano,
                pes.nome AS pesquisador_nome,
                (1 - (v.embedding <=> %s::vector)) * 100 AS score,
                ROW_NUMBER() OVER(PARTITION BY p.titulo ORDER BY (v.embedding <=> %s::vector) ASC) as rn
            FROM producoes p
            JOIN vetores v ON p.id = v.producao_id
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            {where_clause}
            ORDER BY (v.embedding <=> %s::vector) ASC
            LIMIT 50
        )
        SELECT id, titulo, tipo_producao, ano, pesquisador_nome, score
        FROM ranked_producoes
        WHERE rn = 1
        ORDER BY score DESC
        LIMIT 5;
        """

        # O psycopg2 faz o bind automático do vetor porque usamos o register_vector no database.py
        parametros = [vetor_query, vetor_query] + valores_filtros + [vetor_query]
        cursor.execute(sql, tuple(parametros))
        resultados = cursor.fetchall()
        cursor.close()

        return {"resultados": resultados}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro na busca semântica: {str(e)}"
        )
