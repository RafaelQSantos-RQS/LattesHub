MISSING_ID = 9223372036854775807


def test_listar_pesquisadores_com_filtros(client, issue30_data):
    response = client.get(
        "/api/v1/pesquisadores/",
        params={
            "instituicao_id": issue30_data["instituicao"]["id"],
            "areas": issue30_data["area"]["id"],
            "tamanho_pagina": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(
        item["id"] == issue30_data["pesquisador"]["id"]
        for item in body["resultados"]
    )


def test_obter_pesquisador_por_id_sucesso(client, issue30_data):
    pesquisador = issue30_data["pesquisador"]

    response = client.get(f"/api/v1/pesquisadores/{pesquisador['id']}")

    assert response.status_code == 200
    assert response.json()["lattes_id"] == pesquisador["lattes_id"]


def test_obter_pesquisador_por_id_404(client):
    response = client.get(f"/api/v1/pesquisadores/{MISSING_ID}")

    assert response.status_code == 404


def test_obter_producoes_do_pesquisador(client, issue30_data):
    pesquisador_id = issue30_data["pesquisador"]["id"]

    response = client.get(f"/api/v1/pesquisadores/{pesquisador_id}/producoes")

    assert response.status_code == 200
    body = response.json()
    assert body["pesquisador"]["id"] == pesquisador_id
    assert len(body["producoes"]) >= 2


def test_obter_producoes_do_pesquisador_404(client):
    response = client.get(f"/api/v1/pesquisadores/{MISSING_ID}/producoes")

    assert response.status_code == 404
