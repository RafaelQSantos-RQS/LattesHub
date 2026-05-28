import os
import logging
import psycopg2
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv
from openai import OpenAI
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
import openai

# Configuração de Logs Limpos e Profissionais
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Carrega Variáveis de Ambiente
load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "lattes_hub")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Inicializa Cliente OpenAI
client = OpenAI(api_key=OPENAI_API_KEY)
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))

@retry(
    wait=wait_exponential(multiplier=1, min=2, max=20),
    stop=stop_after_attempt(5),
    retry=retry_if_exception_type((openai.RateLimitError, openai.APIConnectionError)),
    before_sleep=lambda retry_state: logger.warning(f"Rate limit ou erro de rede. Tentando novamente em {retry_state.next_action.sleep}s...")
)
def obter_embeddings_lote(textos: list[str]) -> list[list[float]]:
    """Chama a API da OpenAI para gerar embeddings em lote com Exponential Backoff."""
    response = client.embeddings.create(
        input=textos,
        model=EMBEDDING_MODEL
    )
    return [d.embedding for d in response.data]

def conectar_banco():
    """Cria conexão com o PostgreSQL."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )

def executar_carga_delta():
    """Busca produções sem vetor, gera embeddings apenas do título e salva no banco via Bulk Insert."""
    logger.info("Iniciando processo de Enriquecimento Semântico (Fase 2)...")
    
    conn = conectar_banco()
    register_vector(conn)
    cursor = conn.cursor()

    try:
        # 1. Delta Load: Seleciona apenas os IDs e os Títulos das produções
        query_busca = """
            SELECT p.id, p.titulo
            FROM producoes p
            LEFT JOIN vetores v ON p.id = v.producao_id
            WHERE p.tipo_producao = 'ARTIGO PUBLICADO' 
              AND v.id IS NULL
            ORDER BY p.id ASC;
        """
        cursor.execute(query_busca)
        producoes = cursor.fetchall()
        
        total_pendente = len(producoes)
        logger.info(f"Encontrados {total_pendente} artigos pendentes de processamento.")

        if total_pendente == 0:
            logger.info("Nenhuma produção pendente. Sistema atualizado!")
            return

        # 2. Processamento em Lotes (Batches)
        for i in range(0, total_pendente, BATCH_SIZE):
            lote = producoes[i:i+BATCH_SIZE]
            
            ids_lote = []
            textos_lote = []

            for prod_id, titulo in lote:
                # Payload Semantic Build: Apenas o Título Limpo
                titulo_limpo = titulo.strip() if titulo else "Sem Título"
                
                ids_lote.append(prod_id)
                textos_lote.append(titulo_limpo)

            logger.info(f"Processando lote {i//BATCH_SIZE + 1} (IDs {ids_lote[0]} ao {ids_lote[-1]})...")

            # 3. Chamada da IA
            embeddings_lote = obter_embeddings_lote(textos_lote)

            # 4. Gravação Performática (Bulk Insert com pgvector syntax)
            dados_insercao = [
                (prod_id, emb, EMBEDDING_MODEL) 
                for prod_id, emb in zip(ids_lote, embeddings_lote)
            ]

            query_insercao = """
                INSERT INTO vetores (producao_id, embedding, modelo_embedding)
                VALUES %s
            """
            
            execute_values(cursor, query_insercao, dados_insercao)
            conn.commit()
            
            logger.info(f"Lote {i//BATCH_SIZE + 1} gravado com sucesso! ({len(lote)} registros)")

        logger.info("Carga Delta finalizada com sucesso!")

    except Exception as e:
        conn.rollback()
        logger.error(f"Erro catastrófico no processamento: {e}", exc_info=True)
    finally:
        cursor.close()
        conn.close()
        logger.info("Conexão com o banco encerrada.")

if __name__ == "__main__":
    executar_carga_delta()
