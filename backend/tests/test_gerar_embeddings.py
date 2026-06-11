from app.scripts import gerar_embeddings


def test_tipos_producao_elegiveis_usa_default(monkeypatch):
    monkeypatch.delenv("EMBEDDING_PRODUCTION_TYPES", raising=False)

    assert gerar_embeddings.tipos_producao_elegiveis() == [
        "ARTIGO PUBLICADO",
        "TRABALHO EM EVENTOS",
        "LIVRO PUBLICADO",
        "CAPITULO DE LIVRO",
    ]


def test_tipos_producao_elegiveis_aceita_configuracao(monkeypatch):
    monkeypatch.setenv(
        "EMBEDDING_PRODUCTION_TYPES",
        "ARTIGO PUBLICADO, TRABALHO EM EVENTOS, ,LIVRO PUBLICADO",
    )

    assert gerar_embeddings.tipos_producao_elegiveis() == [
        "ARTIGO PUBLICADO",
        "TRABALHO EM EVENTOS",
        "LIVRO PUBLICADO",
    ]


def test_montar_texto_embedding_compoe_metadados_relevantes():
    texto = gerar_embeddings.montar_texto_embedding(
        {
            "titulo": "Aprendizagem profunda aplicada",
            "titulo_ingles": "Applied deep learning",
            "tipo_producao": "TRABALHO EM EVENTOS",
            "natureza": "RESUMO",
            "ano": 2024,
            "idioma": "Portugues",
            "revista": "NÃO SE APLICA",
            "evento": "Congresso Brasileiro de IA",
            "areas": "CIENCIAS EXATAS / Computacao",
            "palavras_chave": "redes neurais; saude",
        }
    )

    assert "Titulo: Aprendizagem profunda aplicada" in texto
    assert "Titulo em ingles: Applied deep learning" in texto
    assert "Tipo: TRABALHO EM EVENTOS" in texto
    assert "Natureza: RESUMO" in texto
    assert "Ano: 2024" in texto
    assert "Evento: Congresso Brasileiro de IA" in texto
    assert "Areas: CIENCIAS EXATAS / Computacao" in texto
    assert "Palavras-chave: redes neurais; saude" in texto
    assert "NÃO SE APLICA" not in texto
