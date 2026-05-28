import os
import logging
import psycopg2
from dotenv import load_dotenv
from openai import OpenAI
# Importa o registrador oficial do pgvector para o psycopg2
from pgvector.psycopg2 import register_vector

# Configuração de Logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "lattes_hub")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

def buscar_semanticamente(pergunta_usuario: str):
    print(f"\n{'='*60}\n🔍 PERGUNTA: '{pergunta_usuario}'\n{'='*60}\n")
    
    conn = None
    cursor = None
    
    try:
        # Step 1: Gerar o embedding (Lista pura de floats)
        logger.info("[Step 1] Conectando à API da OpenAI para vetorizar a pergunta...")
        response = client.embeddings.create(
            input=pergunta_usuario,
            model="text-embedding-3-small"
        )
        # Pegamos a lista pura, SEM converter para string!
        vetor_pergunta = response.data[0].embedding
        logger.info("[Step 1 Concluído] Vetor numérico gerado com sucesso.")

        # Step 2: Conexão e Registro do Adaptador
        logger.info("[Step 2] Conectando ao banco e registrando adaptador nativo do pgvector...")
        conn = psycopg2.connect(
            host=DB_HOST, port=DB_PORT, dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD
        )
        cursor = conn.cursor()
        
        # AQUI A MÁGICA ACONTECE: Ensinamos o psycopg2 a ler/escrever vetores nativamente
        register_vector(conn)
        logger.info("[Step 2 Concluído] Adaptador pgvector registrado com sucesso.")

       # Step 3: Execução da Query Vetorial Nativa com Filtro de Distância Nula
        logger.info("[Step 3] Executando Query Vetorial nativa com filtro de segurança...")
        query = """
            SELECT p.titulo, p.ano, p.revista, (v.embedding <=> %s::vector) as distancia
            FROM vetores v
            JOIN producoes p ON p.id = v.producao_id
            WHERE (v.embedding <=> %s::vector) IS NOT NULL
            ORDER BY v.embedding <=> %s::vector ASC
            LIMIT 5;
        """
        
        # Passamos o vetor 3 vezes agora (Select, Where e Order By)
        cursor.execute(query, (vetor_pergunta, vetor_pergunta, vetor_pergunta))
        resultados = cursor.fetchall()
        logger.info(f"[Step 3 Concluído] Encontrados {len(resultados)} artigos.")

        # Step 4: Exibição
        print("\n" + "="*60)
        print("🏆 OS 5 ARTIGOS MAIS RELEVANTES ENCONTRADOS:")
        print("="*60)
        
        for i, (titulo, ano, revista, distancia) in enumerate(resultados, 1):
            score = (1 - distancia) * 100
            print(f"{i}º LUGAR (Similaridade Semântica: {score:.1f}%)")
            print(f"📄 Título: {titulo}")
            print(f"📅 Ano   : {ano} | Revista: {revista or 'N/A'}")
            print("-" * 60)

    except Exception as e:
        logger.error(f"Erro catastrófico: {e}", exc_info=True)
    finally:
        if cursor: 
            cursor.close()
        if conn: 
            conn.close()
        logger.info("Conexão encerrada com segurança.")

if __name__ == "__main__":
    buscar_semanticamente("Inteligência artificial na educação")
