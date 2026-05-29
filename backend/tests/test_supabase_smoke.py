import os

import pytest


pytestmark = pytest.mark.supabase


@pytest.mark.skipif(
    os.getenv("RUN_SUPABASE_SMOKE") != "1" or not os.getenv("DATABASE_URL"),
    reason="Defina RUN_SUPABASE_SMOKE=1 e DATABASE_URL para rodar smoke externo.",
)
def test_supabase_or_deployed_database_smoke(client):
    response = client.get("/api/v1/producoes/", params={"tamanho_pagina": 1})

    assert response.status_code == 200
    assert {"total", "pagina", "tamanho_pagina", "resultados"} <= set(response.json())
