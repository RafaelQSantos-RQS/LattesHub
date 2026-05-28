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
