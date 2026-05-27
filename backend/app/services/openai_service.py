import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def gerar_embedding_query(texto: str) -> list[float]:
    """Gera o vetor da pergunta do usuário."""
    response = client.embeddings.create(input=texto, model="text-embedding-3-small")
    return response.data[0].embedding
