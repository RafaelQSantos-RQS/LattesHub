MISSING_ID = 9223372036854775807


def test_listar_producoes_com_filtros(client, issue30_data):
    response = client.get(
        "/api/v1/producoes/",
        params={
            "tipo_producao": "ARTIGO PUBLICADO",
            "ano": 2024,
            "instituicao_id": issue30_data["instituicao"]["id"],
            "areas": issue30_data["area"]["id"],
            "tamanho_pagina": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert any(
        item["id"] == issue30_data["producao_textual"]["id"]
        for item in body["resultados"]
    )


def test_busca_textual_por_fts_sucesso(client, issue30_data):
    response = client.get("/api/v1/producoes/", params={"termo": "pytermbusca"})

    assert response.status_code == 200
    resultados = response.json()["resultados"]
    assert any(
        item["id"] == issue30_data["producao_textual"]["id"]
        for item in resultados
    )


def test_busca_textual_sem_resultado_retorna_lista_vazia(client):
    response = client.get(
        "/api/v1/producoes/",
        params={"termo": "termoimprovavelsemresultadoissue30"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["resultados"] == []


def test_busca_textual_rejeita_termo_curto(client):
    response = client.get("/api/v1/producoes/", params={"termo": "a"})

    assert response.status_code == 422


def test_obter_producao_por_id_sucesso(client, issue30_data):
    producao = issue30_data["producao_textual"]

    response = client.get(f"/api/v1/producoes/{producao['id']}")

    assert response.status_code == 200
    assert response.json()["titulo"] == producao["titulo"]


def test_obter_producao_por_id_404(client):
    response = client.get(f"/api/v1/producoes/{MISSING_ID}")

    assert response.status_code == 404
