import os
import time
import httpx
import psycopg2
import re
from psycopg2.extras import DictCursor
from dotenv import load_dotenv

# Carrega as variáveis do ficheiro .env caso seja executado fora do Docker
load_dotenv()

# Vai buscar a URL da base de dados (que agora aponta para o Supabase)
DATABASE_URL = os.getenv("DATABASE_URL")

# IMPORTANTE: Coloque o seu e-mail aqui para usar o "Polite Pool" da Crossref
# (Garante mais velocidade e menos bloqueios)
EMAIL_CONTATO = "seu_email@dominio.com"


def limpar_tags_xml(texto):
    """Remove tags como <jats:p>, </jats:title> que vêm na API da Crossref"""
    if not texto:
        return None
    # Remove qualquer coisa entre < e >
    texto_limpo = re.sub(r"<[^>]+>", " ", texto)
    # Remove espaços duplos que possam ter ficado
    texto_limpo = re.sub(r"\s+", " ", texto_limpo)
    return texto_limpo.strip()


def extrair_resumos_crossref():
    if not DATABASE_URL:
        print(
            "Erro: DATABASE_URL não encontrada. Verifique as suas variáveis de ambiente."
        )
        return

    # Estabelece a ligação ao PostgreSQL no Supabase
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=DictCursor)

    try:
        # Procura apenas produções que tenham DOI, mas em que o resumo ainda esteja vazio
        cursor.execute("""
            SELECT id, doi 
            FROM producoes 
            WHERE doi IS NOT NULL 
              AND TRIM(doi) != '' 
              AND UPPER(TRIM(doi)) NOT IN ('NÃO INFORMADO', 'N├ÂO INFORMADO', 'NAO INFORMADO')
              AND resumo IS NULL
        """)

        producoes = cursor.fetchall()
        total = len(producoes)
        print(f"Encontradas {total} produções a necessitar de resumo.")

        atualizados = 0
        erros = 0

        # Cabeçalho para identificar o script na Crossref (Polite Pool)
        headers = {"User-Agent": f"LattesHubBot/1.0 (mailto:{EMAIL_CONTATO})"}

        # Utiliza o Client do httpx para partilhar a mesma sessão TCP e melhorar o desempenho
        with httpx.Client(timeout=10.0, headers=headers) as client:
            for index, row in enumerate(producoes, 1):
                prod_id = row["id"]
                doi = row["doi"].strip()

                # Limpa o prefixo do DOI caso exista
                if doi.startswith("http"):
                    doi = doi.split("doi.org/")[-1]

                # Endpoint da Crossref
                url = f"https://api.crossref.org/works/{doi}"

                max_tentativas = 3
                tentativa_atual = 0
                sucesso_na_requisicao = False

                # Sistema de retentativas (Retry) para contornar problemas de rede
                while tentativa_atual < max_tentativas and not sucesso_na_requisicao:
                    try:
                        response = client.get(url)

                        if response.status_code == 200:
                            data = response.json()
                            # A Crossref guarda o resumo dentro de message -> abstract
                            resumo_sujo = data.get("message", {}).get("abstract")

                            # Limpa as tags JATS XML
                            resumo = limpar_tags_xml(resumo_sujo)

                            if resumo:
                                # Atualiza a base de dados
                                cursor.execute(
                                    "UPDATE producoes SET resumo = %s WHERE id = %s",
                                    (resumo, prod_id),
                                )
                                atualizados += 1
                                print(f"[{index}/{total}] Sucesso: {doi}")
                            else:
                                print(
                                    f"[{index}/{total}] Sem resumo disponível na API: {doi}"
                                )

                            sucesso_na_requisicao = True  # Sai do laço de tentativas

                        elif response.status_code == 404:
                            print(
                                f"[{index}/{total}] DOI não encontrado na base deles: {doi}"
                            )
                            sucesso_na_requisicao = (
                                True  # Sai do laço (não adianta tentar de novo)
                            )

                        elif response.status_code == 429:
                            tentativa_atual += 1
                            print(
                                f"[{index}/{total}] Rate limit atingido. A pausar 10s... (Tentativa {tentativa_atual}/{max_tentativas})"
                            )
                            time.sleep(10)

                        else:
                            print(
                                f"[{index}/{total}] Erro {response.status_code} na procura: {doi}"
                            )
                            sucesso_na_requisicao = (
                                True  # Sai do laço para outros erros
                            )

                    except Exception as e:
                        tentativa_atual += 1
                        print(
                            f"[{index}/{total}] Falha de ligação: {str(e)}. A pausar 5s... (Tentativa {tentativa_atual}/{max_tentativas})"
                        )
                        time.sleep(5)

                # Se esgotou as tentativas e falhou definitivamente
                if not sucesso_na_requisicao:
                    erros += 1
                    print(
                        f"[{index}/{total}] Ignorado após {max_tentativas} tentativas falhadas: {doi}"
                    )

                # Faz o commit a cada 50 registos para salvar o progresso de forma faseada
                if index % 50 == 0:
                    conn.commit()

                # A Crossref (no Polite Pool) costuma ser muito mais rápida.
                # Reduzimos o tempo de pausa para ganhar velocidade, mas ainda não sobrecarregar.
                time.sleep(0.5)

        # Faz o commit final do que sobrou
        conn.commit()
        print(
            f"\nFinalizado! Atualizados: {atualizados}. Erros definitivos/ignorados: {erros}"
        )

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    extrair_resumos_crossref()
