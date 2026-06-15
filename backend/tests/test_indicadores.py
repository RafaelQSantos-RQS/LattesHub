def test_resumo_indicadores_retorna_estrutura(client, issue30_data):
    response = client.get("/api/v1/indicadores/resumo")

    assert response.status_code == 200
    body = response.json()
    assert "total_producoes" in body
    assert "total_pesquisadores" in body
    assert "producoes_por_ano" in body
    assert "top_areas" in body
    assert isinstance(body["total_producoes"], int)
    assert isinstance(body["total_pesquisadores"], int)
    assert isinstance(body["producoes_por_ano"], list)
    assert isinstance(body["top_areas"], list)


def test_resumo_indicadores_conta_dados_reais(client, issue30_data):
    response = client.get("/api/v1/indicadores/resumo")

    assert response.status_code == 200
    body = response.json()
    assert body["total_producoes"] >= 2
    assert body["total_pesquisadores"] >= 1


def test_resumo_indicadores_producoes_por_ano_ordenadas(client, issue30_data):
    response = client.get("/api/v1/indicadores/resumo")

    body = response.json()
    anos = [p["ano"] for p in body["producoes_por_ano"]]
    assert anos == sorted(anos)


def test_resumo_indicadores_top_areas_tem_area_e_total(client, issue30_data):
    response = client.get("/api/v1/indicadores/resumo")

    body = response.json()
    for item in body["top_areas"]:
        assert "area" in item
        assert "total" in item
        assert isinstance(item["total"], int)
        assert item["total"] > 0


def test_resumo_indicadores_top_areas_respeita_filtro_grande_area(
    client,
    db_conn,
    issue30_data,
):
    outra_area = f"{issue30_data['prefix']} Ciencias Humanas"

    with db_conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO areas_conhecimento (grande_area, area, sub_area, especialidade)
            VALUES (%s, 'Educacao', 'Avaliacao', NULL)
            RETURNING id;
            """,
            (outra_area,),
        )
        outra_area_id = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO pesquisador_areas (pesquisador_id, area_id)
            VALUES (%s, %s);
            """,
            (issue30_data["pesquisador"]["id"], outra_area_id),
        )
    db_conn.commit()

    try:
        response = client.get(
            "/api/v1/indicadores/resumo",
            params={"grande_area": issue30_data["area"]["grande_area"]},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["top_areas"] == [
            {"area": issue30_data["area"]["grande_area"], "total": 2}
        ]
    finally:
        with db_conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM pesquisador_areas WHERE area_id = %s;",
                (outra_area_id,),
            )
            cursor.execute(
                "DELETE FROM areas_conhecimento WHERE id = %s;",
                (outra_area_id,),
            )
        db_conn.commit()


def test_resumo_indicadores_top_areas_respeita_multiplas_grandes_areas(
    client,
    db_conn,
    issue30_data,
):
    outra_area = f"{issue30_data['prefix']} Ciencias Humanas"

    with db_conn.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO areas_conhecimento (grande_area, area, sub_area, especialidade)
            VALUES (%s, 'Educacao', 'Avaliacao', NULL)
            RETURNING id;
            """,
            (outra_area,),
        )
        outra_area_id = cursor.fetchone()[0]
        cursor.execute(
            """
            INSERT INTO pesquisador_areas (pesquisador_id, area_id)
            VALUES (%s, %s);
            """,
            (issue30_data["pesquisador"]["id"], outra_area_id),
        )
    db_conn.commit()

    try:
        response = client.get(
            "/api/v1/indicadores/resumo",
            params=[
                ("grande_area", issue30_data["area"]["grande_area"]),
                ("grande_area", outra_area),
                ("instituicao", issue30_data["instituicao"]["nome"]),
            ],
        )

        assert response.status_code == 200
        body = response.json()
        assert {item["area"] for item in body["top_areas"]} == {
            issue30_data["area"]["grande_area"],
            outra_area,
        }
        assert {item["total"] for item in body["top_areas"]} == {2}
    finally:
        with db_conn.cursor() as cursor:
            cursor.execute(
                "DELETE FROM pesquisador_areas WHERE area_id = %s;",
                (outra_area_id,),
            )
            cursor.execute(
                "DELETE FROM areas_conhecimento WHERE id = %s;",
                (outra_area_id,),
            )
        db_conn.commit()


def test_resumo_indicadores_inclui_quadrienio_e_pesquisadores(client, issue30_data):
    response = client.get("/api/v1/indicadores/resumo")

    assert response.status_code == 200
    body = response.json()
    assert "producoes_por_quadrienio" in body
    assert "top_pesquisadores" in body
    for item in body["producoes_por_quadrienio"]:
        assert "quadrienio" in item
        assert isinstance(item["total"], int)
    for item in body["top_pesquisadores"]:
        assert {"pesquisador_id", "nome", "total"} <= item.keys()
        assert isinstance(item["pesquisador_id"], int)
        assert item["total"] > 0


def test_resumo_indicadores_top_pesquisadores_respeita_filtro_instituicao(
    client, issue30_data
):
    response = client.get(
        "/api/v1/indicadores/resumo",
        params={"instituicao": issue30_data["instituicao"]["nome"]},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["top_pesquisadores"] == [
        {
            "pesquisador_id": issue30_data["pesquisador"]["id"],
            "nome": issue30_data["pesquisador"]["nome"],
            "total": 2,
        }
    ]


def test_resumo_indicadores_filtra_por_quadrienio(client, issue30_data):
    # Ambas as produções do fixture (2023 e 2024) caem no quadriênio 2021-2024.
    dentro = client.get(
        "/api/v1/indicadores/resumo",
        params=[
            ("instituicao", issue30_data["instituicao"]["nome"]),
            ("quadrienio", "2021-2024"),
        ],
    )
    assert dentro.status_code == 200
    body_dentro = dentro.json()
    assert body_dentro["total_producoes"] == 2
    assert body_dentro["producoes_por_quadrienio"] == [
        {"quadrienio": "2021-2024", "total": 2}
    ]

    fora = client.get(
        "/api/v1/indicadores/resumo",
        params=[
            ("instituicao", issue30_data["instituicao"]["nome"]),
            ("quadrienio", "2017-2020"),
        ],
    )
    assert fora.status_code == 200
    assert fora.json()["total_producoes"] == 0


def test_filtros_inclui_quadrienios(client, issue30_data):
    response = client.get("/api/v1/indicadores/filtros")

    assert response.status_code == 200
    body = response.json()
    assert "quadrienios" in body
    assert "2021-2024" in body["quadrienios"]


def test_resumo_indicadores_qualis_aceita_multiplos_estratos_com_sem_qualis(
    client,
    issue30_data,
):
    response = client.get(
        "/api/v1/indicadores/resumo",
        params=[
            ("instituicao", issue30_data["instituicao"]["nome"]),
            ("qualis", "A1"),
            ("qualis", "Sem Qualis"),
        ],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total_producoes"] == 2
    assert body["qualis_distribuicao"] == [
        {"estrato": "A1", "total": 1},
        {"estrato": "Sem Qualis", "total": 1},
    ]
