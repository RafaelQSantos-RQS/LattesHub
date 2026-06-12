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


def test_listar_producoes_filtra_por_intervalo_de_anos(client, issue30_data):
    response = client.get(
        "/api/v1/producoes/",
        params={
            "ano_inicio": 2023,
            "ano_fim": 2023,
            "instituicao_id": issue30_data["instituicao"]["id"],
            "tamanho_pagina": 10,
        },
    )

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["resultados"]}
    assert issue30_data["producao_semantica"]["id"] in ids
    assert issue30_data["producao_textual"]["id"] not in ids


def test_listar_producoes_filtra_por_qualis_a1(client, issue30_data):
    response = client.get(
        "/api/v1/producoes/",
        params={
            "qualis_estrato": "A1",
            "instituicao_id": issue30_data["instituicao"]["id"],
            "tamanho_pagina": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert [item["id"] for item in body["resultados"]] == [
        issue30_data["producao_textual"]["id"]
    ]
    assert body["resultados"][0]["qualis_estrato"] == "A1"


def test_listar_producoes_filtra_por_sem_qualis(client, issue30_data):
    response = client.get(
        "/api/v1/producoes/",
        params={
            "qualis_estrato": "Sem Qualis",
            "instituicao_id": issue30_data["instituicao"]["id"],
            "tamanho_pagina": 10,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert [item["id"] for item in body["resultados"]] == [
        issue30_data["producao_semantica"]["id"]
    ]
    assert body["resultados"][0]["qualis_estrato"] is None


def test_listar_tipos_producao_retorna_tipos_reais(client, issue30_data):
    response = client.get("/api/v1/producoes/tipos")

    assert response.status_code == 200
    tipos = {
        item["tipo_producao"]: item["total"]
        for item in response.json()["resultados"]
    }
    assert tipos["ARTIGO PUBLICADO"] >= 1
    assert tipos["TRABALHO EM EVENTOS"] >= 1


def test_busca_textual_por_fts_sucesso(client, issue30_data):
    response = client.get("/api/v1/producoes/", params={"termo": "pytermbusca"})

    assert response.status_code == 200
    resultados = response.json()["resultados"]
    assert any(
        item["id"] == issue30_data["producao_textual"]["id"] for item in resultados
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


def test_erro_interno_500_nao_vaza_detalhes(client):
    """
    Garante que erros catastróficos no banco de dados não exponham
    detalhes da query ou senhas no JSON de resposta.
    """
    from app.main import app
    from app.core.database import get_db_connection

    def mock_get_db_connection_com_falha():
        class FakeCursor:
            def execute(self, *args, **kwargs):
                raise Exception("SenhaSecretaDoBancoDeDados123!")

            def close(self):
                pass

        class FakeConn:
            def cursor(self, *args, **kwargs):
                return FakeCursor()

            def rollback(self):
                pass

        yield FakeConn()

    app.dependency_overrides[get_db_connection] = mock_get_db_connection_com_falha

    try:
        response = client.get("/api/v1/producoes/")

        assert response.status_code == 500
        json_resp = response.json()

        assert "SenhaSecretaDoBancoDeDados123!" not in response.text
        assert (
            json_resp["detail"] == "Erro interno no servidor ao processar a requisição."
        )
    finally:
        app.dependency_overrides.clear()
