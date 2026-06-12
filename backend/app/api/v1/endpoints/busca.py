from fastapi import APIRouter, Depends, HTTPException
from app.schemas.buscas import BuscaSemanticaRequest, BuscaSemanticaResponse, ChatRequest, ChatResponse
from app.core.database import get_db_connection
from psycopg2.extras import RealDictCursor
from openai import OpenAI
import os
import logging

router = APIRouter()
logger = logging.getLogger(__name__)
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

        if payload.ano is not None:
            filtros.append("p.ano = %s")
            valores_filtros.append(payload.ano)

        if payload.ano_inicio is not None:
            filtros.append("p.ano >= %s")
            valores_filtros.append(payload.ano_inicio)

        if payload.ano_fim is not None:
            filtros.append("p.ano <= %s")
            valores_filtros.append(payload.ano_fim)

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

        if payload.qualis_estrato == "Sem Qualis":
            filtros.append("q.estrato IS NULL")
        elif payload.qualis_estrato:
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
        logger.error(f"Erro na busca semântica: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno no servidor ao processar a requisição.",
        )


@router.post("/chat", response_model=ChatResponse)
def chat_agente(payload: ChatRequest, db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        # 1. Embedding da pergunta
        embed_resp = client.embeddings.create(
            input=payload.pergunta,
            model="text-embedding-3-small",
        )
        vetor = embed_resp.data[0].embedding

        # 2. Busca vetorial: 5 produções mais relevantes
        cursor.execute(
            """
            WITH ranked AS (
                SELECT
                    p.id,
                    p.titulo,
                    p.tipo_producao,
                    p.ano,
                    p.palavras_chave,
                    p.revista,
                    p.evento,
                    pes.nome AS pesquisador_nome,
                    (1 - (v.embedding <=> %s::vector)) * 100 AS score,
                    ROW_NUMBER() OVER (PARTITION BY p.titulo ORDER BY (v.embedding <=> %s::vector) ASC) AS rn
                FROM producoes p
                JOIN vetores v ON p.id = v.producao_id
                JOIN pesquisadores pes ON p.pesquisador_id = pes.id
                ORDER BY (v.embedding <=> %s::vector) ASC
                LIMIT 30
            )
            SELECT id, titulo, tipo_producao, ano, palavras_chave, revista, evento, pesquisador_nome
            FROM ranked
            WHERE rn = 1
            ORDER BY score DESC
            LIMIT 5;
            """,
            (vetor, vetor, vetor),
        )
        producoes = cursor.fetchall()
        cursor.close()

        if not producoes:
            raise HTTPException(status_code=503, detail="Índice semântico ainda não foi gerado.")

        # 3. Monta contexto para o LLM
        context_parts = []
        for i, p in enumerate(producoes, 1):
            venue = p.get("revista") or p.get("evento") or "N/A"
            palavras = p.get("palavras_chave") or "N/A"
            context_parts.append(
                f"[{i}] Título: {p['titulo']}\n"
                f"    Autor: {p['pesquisador_nome']}\n"
                f"    Ano: {p['ano'] or 'N/A'}\n"
                f"    Veículo: {venue}\n"
                f"    Palavras-chave: {palavras[:400]}"
            )

        context_text = "\n\n".join(context_parts)

        system_prompt = (
            "Você é um assistente especializado em pesquisa científica do LattesHub. "
            "Responda à pergunta do usuário baseando-se ESTRITAMENTE nas produções científicas fornecidas no contexto. "
            "Não invente informações além do que está no contexto. "
            "Cite os autores e títulos relevantes na sua resposta. "
            "Responda em português brasileiro de forma clara e objetiva."
        )

        user_message = (
            f"Contexto — produções científicas recuperadas:\n\n{context_text}\n\n"
            f"Pergunta: {payload.pergunta}"
        )

        # 4. Chamada ao ChatCompletion
        chat_resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=800,
            temperature=0.3,
        )

        resposta = chat_resp.choices[0].message.content or ""

        # 5. Retorna resposta + fontes
        fontes = [
            {"id": p["id"], "titulo": p["titulo"], "pesquisador_nome": p["pesquisador_nome"], "ano": p["ano"]}
            for p in producoes
        ]

        return {"resposta": resposta, "fontes": fontes}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no chat do agente: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno ao processar a pergunta.",
        )
