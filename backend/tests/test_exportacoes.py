import csv
from io import StringIO


def test_exportar_producoes_csv(client, issue30_data):
    response = client.get("/api/v1/exportacoes/producoes.csv")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "latteshub_producoes.csv" in response.headers["content-disposition"]

    rows = list(csv.DictReader(StringIO(response.text)))
    fixture_rows = [
        row
        for row in rows
        if row["producao_id"] == str(issue30_data["producao_textual"]["id"])
    ]
    assert fixture_rows
    assert fixture_rows[0]["qualis_estrato"] == "A1"
    assert fixture_rows[0]["qualis_quadrienio"] == "2020-2024"
    assert fixture_rows[0]["dim_quadrienio_ano"] == "2020-2024-2024"
    assert fixture_rows[0]["dim_pesquisador"]
    assert fixture_rows[0]["fato_quantidade_producoes"] == "1"


def test_exportar_producoes_csv_respeita_filtros(client, issue30_data):
    response = client.get(
        "/api/v1/exportacoes/producoes.csv",
        params={
            "termo": "pytermbusca",
            "tipo_producao": "ARTIGO PUBLICADO",
            "ano_inicio": 2024,
            "ano_fim": 2024,
            "instituicao_id": issue30_data["instituicao"]["id"],
            "areas": issue30_data["area"]["id"],
        },
    )

    assert response.status_code == 200

    rows = list(csv.DictReader(StringIO(response.text)))
    assert [row["producao_id"] for row in rows] == [
        str(issue30_data["producao_textual"]["id"])
    ]


def test_exportar_producoes_csv_filtra_por_qualis(client, issue30_data):
    response = client.get(
        "/api/v1/exportacoes/producoes.csv",
        params={
            "qualis_estrato": "Sem Qualis",
            "instituicao_id": issue30_data["instituicao"]["id"],
        },
    )

    assert response.status_code == 200

    rows = list(csv.DictReader(StringIO(response.text)))
    assert [row["producao_id"] for row in rows] == [
        str(issue30_data["producao_semantica"]["id"])
    ]
    assert rows[0]["qualis_estrato"] == ""
