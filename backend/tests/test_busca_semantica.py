class _EmbeddingItem:
    embedding = [1.0] + [0.0] * 1535


class _EmbeddingResponse:
    data = [_EmbeddingItem()]


def test_busca_semantica_com_openai_mockado(client, issue30_data, monkeypatch):
    from app.api.v1.endpoints import busca

    def fake_create(input, model):
        assert input == "consulta semantica de teste"
        assert model == "text-embedding-3-small"
        return _EmbeddingResponse()

    monkeypatch.setattr(busca.client.embeddings, "create", fake_create)

    response = client.post(
        "/api/v1/busca/semantica",
        json={
            "pergunta": "consulta semantica de teste",
            "tipo_producao": "TRABALHO EM EVENTOS",
            "ano": 2023,
            "instituicao_id": issue30_data["instituicao"]["id"],
            "areas": [issue30_data["area"]["id"]],
        },
    )

    assert response.status_code == 200
    resultados = response.json()["resultados"]
    assert resultados[0]["id"] == issue30_data["producao_semantica"]["id"]
    assert resultados[0]["score"] > 99
    assert resultados[0]["qualis_estrato"] is None


def test_busca_semantica_sem_resultado(client, issue30_data, monkeypatch):
    from app.api.v1.endpoints import busca

    monkeypatch.setattr(
        busca.client.embeddings,
        "create",
        lambda input, model: _EmbeddingResponse(),
    )

    response = client.post(
        "/api/v1/busca/semantica",
        json={
            "pergunta": "consulta semantica de teste",
            "tipo_producao": "TIPO INEXISTENTE",
        },
    )

    assert response.status_code == 200
    assert response.json()["resultados"] == []


def test_busca_semantica_filtra_por_qualis(client, issue30_data, monkeypatch):
    from app.api.v1.endpoints import busca

    monkeypatch.setattr(
        busca.client.embeddings,
        "create",
        lambda input, model: _EmbeddingResponse(),
    )

    response = client.post(
        "/api/v1/busca/semantica",
        json={
            "pergunta": "consulta semantica de teste",
            "instituicao_id": issue30_data["instituicao"]["id"],
            "qualis_estrato": "A1",
        },
    )

    assert response.status_code == 200
    resultados = response.json()["resultados"]
    assert resultados[0]["id"] == issue30_data["producao_textual"]["id"]
    assert resultados[0]["qualis_estrato"] == "A1"
    assert resultados[0]["qualis_area_avaliacao"] == "Computacao"
    assert resultados[0]["qualis_titulo"] == (
        f"{issue30_data['prefix']} Periodico de Teste"
    )
