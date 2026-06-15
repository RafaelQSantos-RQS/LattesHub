import logging
import csv
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from app.core.database import get_db_connection

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/producoes.csv")
def exportar_producoes_csv(
    termo: Optional[str] = Query(None, min_length=2),
    tipo_producao: Optional[str] = Query(None),
    ano: Optional[int] = Query(None),
    ano_inicio: Optional[int] = Query(None),
    ano_fim: Optional[int] = Query(None),
    instituicao_id: Optional[int] = Query(None),
    areas: Optional[list[int]] = Query(None),
    qualis_estrato: Optional[str] = Query(None),
    db=Depends(get_db_connection),
):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)

        filtros = []
        valores = []

        if tipo_producao:
            filtros.append("p.tipo_producao = %s")
            valores.append(tipo_producao)

        if termo:
            filtros.append("p.titulo_tsv @@ plainto_tsquery('portuguese_unaccent', %s)")
            valores.append(termo)

        if ano is not None:
            filtros.append("p.ano = %s")
            valores.append(ano)

        if ano_inicio is not None:
            filtros.append("p.ano >= %s")
            valores.append(ano_inicio)

        if ano_fim is not None:
            filtros.append("p.ano <= %s")
            valores.append(ano_fim)

        if instituicao_id:
            filtros.append("pes.instituicao_id = %s")
            valores.append(instituicao_id)

        if qualis_estrato == "Sem Qualis":
            filtros.append("q.estrato IS NULL")
        elif qualis_estrato:
            filtros.append("UPPER(q.estrato) = UPPER(%s)")
            valores.append(qualis_estrato)

        if areas:
            filtros.append("""
                EXISTS (
                    SELECT 1 FROM pesquisador_areas pa_filtro
                    WHERE pa_filtro.pesquisador_id = p.pesquisador_id
                    AND pa_filtro.area_id = ANY(%s)
                )
            """)
            valores.append(areas)

        where_clause = " WHERE " + " AND ".join(filtros) if filtros else ""

        cursor.execute(f"""
            SELECT
                p.id AS producao_id,
                p.tipo_producao,
                p.titulo,
                p.ano,
                COALESCE(p.ano::text, 'Sem ano') AS dim_ano,
                CASE
                    WHEN p.ano IS NULL THEN 'Sem ano'
                    ELSE (p.ano - mod(p.ano - 1, 4))::text
                        || '-' || ((p.ano - mod(p.ano - 1, 4)) + 3)::text
                END AS dim_quadrienio,
                CASE
                    WHEN p.ano IS NULL THEN 'Sem ano'
                    ELSE (p.ano - mod(p.ano - 1, 4))::text
                        || '-' || ((p.ano - mod(p.ano - 1, 4)) + 3)::text
                        || '-' || p.ano::text
                END AS dim_quadrienio_ano,
                p.idioma,
                p.natureza,
                p.doi,
                p.revista,
                p.evento,
                p.issn,
                p.volume,
                p.fasciculo,
                p.pagina_inicial,
                p.pagina_final,
                p.pais_publicacao,
                p.titulo_ingles,
                p.palavras_chave,
                p.coautores,
                pes.id AS pesquisador_id,
                pes.lattes_id,
                pes.nome AS pesquisador_nome,
                concat_ws(' - ', pes.id::text, pes.nome) AS dim_pesquisador,
                i.id AS instituicao_id,
                i.nome AS instituicao_nome,
                i.cidade AS instituicao_cidade,
                i.estado AS instituicao_estado,
                i.pais AS instituicao_pais,
                concat_ws(' - ', i.id::text, i.nome) AS dim_instituicao,
                COALESCE(
                    string_agg(
                        DISTINCT concat_ws(
                            ' > ',
                            ac.grande_area,
                            ac.area,
                            COALESCE(ac.sub_area, 'Geral')
                        ),
                        ' | '
                    ) FILTER (WHERE ac.id IS NOT NULL),
                    ''
                ) AS areas,
                q.estrato AS qualis_estrato,
                q.area_avaliacao AS qualis_area_avaliacao,
                q.titulo AS qualis_titulo,
                CASE
                    WHEN p.ano IS NULL THEN 'Sem ano'
                    ELSE (p.ano - mod(p.ano - 1, 4))::text
                        || '-' || ((p.ano - mod(p.ano - 1, 4)) + 3)::text
                END AS qualis_quadrienio,
                1 AS fato_quantidade_producoes
            FROM producoes p
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            LEFT JOIN instituicoes i ON pes.instituicao_id = i.id
            LEFT JOIN pesquisador_areas pa ON pes.id = pa.pesquisador_id
            LEFT JOIN areas_conhecimento ac ON pa.area_id = ac.id
            LEFT JOIN qualis_periodicos q ON p.issn = q.issn
            {where_clause}
            GROUP BY
                p.id,
                pes.id,
                i.id,
                q.estrato,
                q.area_avaliacao,
                q.titulo
            ORDER BY p.ano DESC NULLS LAST, p.titulo ASC;
        """, tuple(valores))
        linhas = cursor.fetchall()
        cursor.close()

        colunas = [
            "producao_id",
            "tipo_producao",
            "titulo",
            "ano",
            "dim_ano",
            "dim_quadrienio",
            "dim_quadrienio_ano",
            "idioma",
            "natureza",
            "doi",
            "revista",
            "evento",
            "issn",
            "volume",
            "fasciculo",
            "pagina_inicial",
            "pagina_final",
            "pais_publicacao",
            "titulo_ingles",
            "palavras_chave",
            "coautores",
            "pesquisador_id",
            "lattes_id",
            "pesquisador_nome",
            "dim_pesquisador",
            "instituicao_id",
            "instituicao_nome",
            "instituicao_cidade",
            "instituicao_estado",
            "instituicao_pais",
            "dim_instituicao",
            "areas",
            "qualis_estrato",
            "qualis_area_avaliacao",
            "qualis_titulo",
            "qualis_quadrienio",
            "fato_quantidade_producoes",
        ]

        arquivo = StringIO()
        writer = csv.DictWriter(arquivo, fieldnames=colunas)
        writer.writeheader()
        writer.writerows(linhas)
        arquivo.seek(0)

        headers = {
            "Content-Disposition": 'attachment; filename="latteshub_producoes.csv"'
        }
        return StreamingResponse(
            iter([arquivo.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers=headers,
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Erro ao exportar produções em CSV: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Erro interno no servidor ao processar a requisição.",
        )
