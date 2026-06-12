import os
import time
import requests
import psycopg2
from psycopg2.extras import DictCursor

DATABASE_URL = os.getenv("DATABASE_URL")


def extrair_resumos_semantic_scholar():
    if not DATABASE_URL:
        print("Erro: DATABASE_URL não encontrada.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=DictCursor)

    try:
        cursor.execute("""
            SELECT id, doi 
            FROM producoes 
            WHERE doi IS NOT NULL 
              AND doi != '' 
              AND resumo IS NULL;
        """)

        producoes = cursor.fetchall()
        total = len(producoes)
        print(f"Encontradas {total} produções precisando de resumo.")

        atualizados = 0
        erros = 0

        for index, row in enumerate(producoes, 1):
            prod_id = row["id"]
            doi = row["doi"].strip()

            if doi.startswith("http"):
                doi = doi.split("doi.org/")[-1]

            url = f"https://api.semanticscholar.org/graph/v1/paper/DOI:{doi}?fields=abstract"

            try:
                response = requests.get(url, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    resumo = data.get("abstract")

                    if resumo:
                        cursor.execute(
                            "UPDATE producoes SET resumo = %s WHERE id = %s",
                            (resumo, prod_id),
                        )
                        atualizados += 1
                        print(f"[{index}/{total}] Sucesso: {doi}")
                    else:
                        print(f"[{index}/{total}] Sem resumo disponível na API: {doi}")

                elif response.status_code == 404:
                    print(f"[{index}/{total}] DOI não encontrado na base deles: {doi}")
                elif response.status_code == 429:
                    print(
                        f"[{index}/{total}] Rate limit atingido. Pausando por 10 segundos..."
                    )
                    time.sleep(10)
                else:
                    print(
                        f"[{index}/{total}] Erro {response.status_code} ao buscar: {doi}"
                    )

            except Exception as e:
                erros += 1
                print(f"[{index}/{total}] Falha na requisição para {doi}: {str(e)}")

            if index % 50 == 0:
                conn.commit()

            time.sleep(3.5)

        # Commit final
        conn.commit()
        print(f"\nFinalizado! Atualizados: {atualizados}. Erros de rede: {erros}")

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    extrair_resumos_semantic_scholar()
