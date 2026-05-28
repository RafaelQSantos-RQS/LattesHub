import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from app.core.database import get_db_connection

router = APIRouter()


@router.get("/producoes.csv")
def exportar_producoes_csv(db=Depends(get_db_connection)):
    try:
        cursor = db.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                p.id AS producao_id,
                p.tipo_producao,
                p.titulo,
                p.ano,
                p.idioma,
                p.natureza,
                p.doi,
                p.revista,
                p.evento,
                p.issn,
                pes.id AS pesquisador_id,
                pes.lattes_id,
                pes.nome AS pesquisador_nome,
                i.id AS instituicao_id,
                i.nome AS instituicao_nome,
                i.cidade AS instituicao_cidade,
                i.estado AS instituicao_estado,
                i.pais AS instituicao_pais,
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
                '2020-2024' AS qualis_quadrienio
            FROM producoes p
            JOIN pesquisadores pes ON p.pesquisador_id = pes.id
            LEFT JOIN instituicoes i ON pes.instituicao_id = i.id
            LEFT JOIN pesquisador_areas pa ON pes.id = pa.pesquisador_id
            LEFT JOIN areas_conhecimento ac ON pa.area_id = ac.id
            LEFT JOIN qualis_periodicos q ON p.issn = q.issn
            GROUP BY
                p.id,
                pes.id,
                i.id,
                q.estrato,
                q.area_avaliacao,
                q.titulo
            ORDER BY p.ano DESC NULLS LAST, p.titulo ASC;
        """)
        linhas = cursor.fetchall()
        cursor.close()

        colunas = [
            "producao_id",
            "tipo_producao",
            "titulo",
            "ano",
            "idioma",
            "natureza",
            "doi",
            "revista",
            "evento",
            "issn",
            "pesquisador_id",
            "lattes_id",
            "pesquisador_nome",
            "instituicao_id",
            "instituicao_nome",
            "instituicao_cidade",
            "instituicao_estado",
            "instituicao_pais",
            "areas",
            "qualis_estrato",
            "qualis_area_avaliacao",
            "qualis_titulo",
            "qualis_quadrienio",
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
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao exportar produções em CSV: {str(e)}",
        )
