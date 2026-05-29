def test_listar_areas_agrupadas(client, issue30_data):
    response = client.get("/api/v1/areas/")

    assert response.status_code == 200
    body = response.json()
    assert any(
        grande_area["grande_area"] == issue30_data["area"]["grande_area"]
        for grande_area in body
    )
