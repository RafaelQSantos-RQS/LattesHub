MISSING_ID = 9223372036854775807


def test_listar_instituicoes_com_filtro_de_area(client, issue30_data):
    response = client.get(
        "/api/v1/instituicoes/",
        params={"areas": issue30_data["area"]["id"], "tamanho_pagina": 10},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(
        item["id"] == issue30_data["instituicao"]["id"]
        for item in body["resultados"]
    )


def test_obter_instituicao_por_id_sucesso(client, issue30_data):
    instituicao = issue30_data["instituicao"]

    response = client.get(f"/api/v1/instituicoes/{instituicao['id']}")

    assert response.status_code == 200
    assert response.json()["nome"] == instituicao["nome"]


def test_obter_instituicao_por_id_404(client):
    response = client.get(f"/api/v1/instituicoes/{MISSING_ID}")

    assert response.status_code == 404


def test_listar_pesquisadores_por_instituicao(client, issue30_data):
    instituicao_id = issue30_data["instituicao"]["id"]

    response = client.get(f"/api/v1/instituicoes/{instituicao_id}/pesquisadores")

    assert response.status_code == 200
    body = response.json()
    assert body["instituicao"]["id"] == instituicao_id
    assert any(
        item["id"] == issue30_data["pesquisador"]["id"]
        for item in body["resultados"]
    )


def test_listar_producoes_por_instituicao(client, issue30_data):
    instituicao_id = issue30_data["instituicao"]["id"]

    response = client.get(f"/api/v1/instituicoes/{instituicao_id}/producoes")

    assert response.status_code == 200
    body = response.json()
    assert body["instituicao"]["id"] == instituicao_id
    assert any(
        item["id"] == issue30_data["producao_textual"]["id"]
        for item in body["resultados"]
    )
