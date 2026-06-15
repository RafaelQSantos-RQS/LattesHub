-- Migration 004: analytical star-schema views (Sprint V - Painel Analítico)
-- Materializes the dimensional model consumed by the analytics layer:
--   - dim_quadrienio_ano: Quadrienal-Ano dimension (CAPES 4-year windows, derived dynamically)
--   - dim_pesquisador:    Researcher dimension
--   - fato_producao:      scientific production fact (grain = one row per produção)
-- Quadriênio is derived from the year so it stays correct as data grows, aligned to
-- CAPES windows (..., 2017-2020, 2021-2024, ...): inicio = ano - mod(ano - 1, 4).
-- Safe to run more than once (all statements use CREATE OR REPLACE).

-- ── Dimensão Quadrienal-Ano ────────────────────────────────────────────────
CREATE OR REPLACE VIEW dim_quadrienio_ano AS
SELECT DISTINCT
    p.ano,
    (p.ano - mod(p.ano - 1, 4))                        AS quadrienio_inicio,
    (p.ano - mod(p.ano - 1, 4)) + 3                     AS quadrienio_fim,
    (p.ano - mod(p.ano - 1, 4))::text
        || '-'
        || ((p.ano - mod(p.ano - 1, 4)) + 3)::text      AS quadrienio
FROM producoes p
WHERE p.ano IS NOT NULL;

-- ── Dimensão Pesquisador ───────────────────────────────────────────────────
CREATE OR REPLACE VIEW dim_pesquisador AS
SELECT
    pes.id            AS pesquisador_id,
    pes.lattes_id,
    pes.nome,
    pes.instituicao_id,
    i.nome            AS instituicao_nome
FROM pesquisadores pes
LEFT JOIN instituicoes i ON pes.instituicao_id = i.id;

-- ── Fato: produção científica ──────────────────────────────────────────────
-- Grain: one row per produção. Measure: fato_quantidade_producoes = 1.
CREATE OR REPLACE VIEW fato_producao AS
SELECT
    p.id                                               AS producao_id,
    p.pesquisador_id,
    pes.instituicao_id,
    p.tipo_producao,
    p.ano,
    (p.ano - mod(p.ano - 1, 4))::text
        || '-'
        || ((p.ano - mod(p.ano - 1, 4)) + 3)::text      AS quadrienio,
    p.issn,
    q.estrato                                          AS qualis_estrato,
    1                                                  AS fato_quantidade_producoes
FROM producoes p
JOIN pesquisadores pes ON p.pesquisador_id = pes.id
LEFT JOIN qualis_periodicos q ON p.issn = q.issn;
