from fastapi import APIRouter, Depends, HTTPException
from app.schemas.buscas import BuscaSemanticaRequest, BuscaSemanticaResponse
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor
from openai import OpenAI
import os

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# Ajuste o response_model conforme a sua classe no schemas/busca.py
@router.post("/semantica")
def busca_semantica(payload: BuscaSemanticaRequest, db=Depends(get_db_connection)):
    try:
        # 1. Converte a pergunta do usuário num vetor matemático via OpenAI
        response = client.embeddings.create(
            input=payload.pergunta,  # Certifique-se de que no schemas/busca.py a variável se chama 'pergunta'
            model="text-embedding-3-small",
        )
        vetor_query = response.data[0].embedding

        # 2. Executa a busca vetorial via HNSW com filtro DISTINCT cirúrgico
        cursor = db.cursor(cursor_factory=RealDictCursor)

        sql = """
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
        cursor.execute(sql, (vetor_query, vetor_query, vetor_query))
        resultados = cursor.fetchall()
        cursor.close()

        return {"resultados": resultados}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Erro na busca semântica: {str(e)}"
        )
