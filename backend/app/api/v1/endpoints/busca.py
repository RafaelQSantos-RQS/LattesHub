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
        cursor = db.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT EXISTS (SELECT 1 FROM vetores LIMIT 1) AS possui_vetores")
        if not cursor.fetchone()["possui_vetores"]:
            cursor.close()
            raise HTTPException(
                status_code=503,
                detail="Indice semantico ainda nao foi gerado.",
            )
        # 1. Converte a pergunta do usuário num vetor matemático via OpenAI
        response = client.embeddings.create(
            input=payload.pergunta,  # Certifique-se de que no schemas/busca.py a variável se chama 'pergunta'
            model="text-embedding-3-small",
        )
        vetor_query = response.data[0].embedding

        # 2. Executa a busca vetorial com filtros opcionais de negócio
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

        if payload.qualis_estrato:
            filtros.append("UPPER(q.estrato) = UPPER(%s)")
            valores_filtros.append(payload.qualis_estrato)

        where_clause = "WHERE " + " AND ".join(filtros) if filtros else ""

        sql = f"""
        WITH ranked_producoes AS (
            SELECT 
                p.id, 
                p.titulo, 
                p.tipo_producao, 
                p.ano,
                p.pesquisador_id,
                pes.nome AS pesquisador_nome,
                q.estrato AS qualis_estrato,
                q.area_avaliacao AS qualis_area_avaliacao,
                q.titulo AS qualis_titulo,
                (1 - (v.embedding <=> %s::vector)) * 100 AS score,
                ROW_NUMBER() OVER(PARTITION BY p.titulo ORDER BY (v.embedding <=> %s::vector) ASC) as rn
            FROM producoes p
            JOIN vetores v ON p.id = v.producao_id
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            LEFT JOIN qualis_periodicos q ON p.issn = q.issn
            {where_clause}
            ORDER BY (v.embedding <=> %s::vector) ASC
            LIMIT 50
        )
        SELECT
            id,
            titulo,
            tipo_producao,
            ano,
            pesquisador_id,
            pesquisador_nome,
            score,
            qualis_estrato,
            qualis_area_avaliacao,
            qualis_titulo
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

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro na busca semântica: {str(e)}"
        )
