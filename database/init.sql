-- =====================================================
-- EXTENSÕES
-- =====================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
    ALTER MAPPING FOR hword, hword_part, word
    WITH unaccent, portuguese_stem;

-- =====================================================
-- TABELA: INSTITUICOES
-- =====================================================

CREATE TABLE instituicoes (
    id BIGSERIAL PRIMARY KEY,

    nome VARCHAR(255) NOT NULL UNIQUE,

    cidade VARCHAR(100),
    estado VARCHAR(100),
    pais VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: AREAS_CONHECIMENTO
-- =====================================================

CREATE TABLE areas_conhecimento (
    id BIGSERIAL PRIMARY KEY,

    grande_area VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,

    sub_area VARCHAR(255),
    especialidade VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_area UNIQUE (
        grande_area,
        area,
        sub_area,
        especialidade
    )
);

-- =====================================================
-- TABELA: PESQUISADORES
-- =====================================================

CREATE TABLE pesquisadores (
    id BIGSERIAL PRIMARY KEY,

    -- Identificador oficial do currículo Lattes
    lattes_id VARCHAR(30) NOT NULL UNIQUE,

    nome VARCHAR(255) NOT NULL,

    nome_citacao TEXT,

    orcid VARCHAR(50),

    nacionalidade VARCHAR(100),

    pais_nascimento VARCHAR(100),

    resumo TEXT,

    resumo_ingles TEXT,

    instituicao_id BIGINT
        REFERENCES instituicoes(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: RELACIONAMENTO
-- PESQUISADOR <-> ÁREAS
-- =====================================================

CREATE TABLE pesquisador_areas (
    pesquisador_id BIGINT
        REFERENCES pesquisadores(id)
        ON DELETE CASCADE,

    area_id BIGINT
        REFERENCES areas_conhecimento(id)
        ON DELETE CASCADE,

    PRIMARY KEY (pesquisador_id, area_id)
);

-- =====================================================
-- TABELA: PRODUCOES
-- =====================================================

CREATE TABLE producoes (
    id BIGSERIAL PRIMARY KEY,

    pesquisador_id BIGINT NOT NULL
        REFERENCES pesquisadores(id)
        ON DELETE CASCADE,

    tipo_producao VARCHAR(100) NOT NULL,

    titulo TEXT NOT NULL,

    ano INTEGER,

    idioma VARCHAR(50),

    natureza VARCHAR(100),

    doi VARCHAR(255),

    revista VARCHAR(255),

    evento VARCHAR(255),

    issn VARCHAR(20),

    volume VARCHAR(20),
    fasciculo VARCHAR(20),
    pagina_inicial VARCHAR(20),
    pagina_final VARCHAR(20),
    pais_publicacao VARCHAR(100),
    titulo_ingles TEXT,
    palavras_chave TEXT,
    coautores TEXT,
    resumo TEXT,

    -- Full Text Search
    titulo_tsv tsvector,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: VETORES
-- =====================================================

CREATE TABLE vetores (
    id BIGSERIAL PRIMARY KEY,

    producao_id BIGINT UNIQUE NOT NULL
        REFERENCES producoes(id)
        ON DELETE CASCADE,

    embedding VECTOR(1536),

    modelo_embedding VARCHAR(100),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- TABELA: QUALIS_PERIODICOS
-- =====================================================

CREATE TABLE qualis_periodicos (
    issn VARCHAR(20) PRIMARY KEY,
    titulo TEXT,
    area_avaliacao VARCHAR(255),
    estrato VARCHAR(5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- =====================================================
-- ÍNDICES
-- =====================================================

-- Pesquisadores
CREATE INDEX idx_pesquisadores_lattes
ON pesquisadores(lattes_id);

CREATE INDEX idx_pesquisadores_nome
ON pesquisadores(nome);

-- Produções
CREATE INDEX idx_producoes_pesquisador
ON producoes(pesquisador_id);

CREATE INDEX idx_producoes_ano
ON producoes(ano);

CREATE INDEX idx_producoes_tipo
ON producoes(tipo_producao);

CREATE INDEX idx_producoes_doi
ON producoes(doi);

-- Full Text Search
CREATE INDEX idx_producoes_tsv
ON producoes
USING GIN(titulo_tsv);

-- Vetores
CREATE INDEX idx_vetores_embedding
ON vetores
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Otimiza a busca pelo estrato (ex: filtrar apenas artigos A1)
CREATE INDEX idx_qualis_estrato ON qualis_periodicos(estrato);

-- Cria o índice na tabela de produções para o JOIN voar!
CREATE INDEX idx_producoes_issn ON producoes(issn);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE instituicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas_conhecimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pesquisador_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vetores ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualis_periodicos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS
-- =====================================================

CREATE POLICY "public_read_qualis"
ON qualis_periodicos
FOR SELECT
USING (true);

CREATE POLICY "public_read_instituicoes"
ON instituicoes
FOR SELECT
USING (true);

CREATE POLICY "public_read_areas"
ON areas_conhecimento
FOR SELECT
USING (true);

CREATE POLICY "public_read_pesquisadores"
ON pesquisadores
FOR SELECT
USING (true);

CREATE POLICY "public_read_pesquisador_areas"
ON pesquisador_areas
FOR SELECT
USING (true);

CREATE POLICY "public_read_producoes"
ON producoes
FOR SELECT
USING (true);

CREATE POLICY "public_read_vetores"
ON vetores
FOR SELECT
USING (true);


CREATE OR REPLACE FUNCTION atualiza_titulo_tsv() RETURNS trigger AS $$
BEGIN
    NEW.titulo_tsv := to_tsvector('portuguese_unaccent',
        coalesce(NEW.titulo, '') || ' ' ||
        coalesce(NEW.revista, '') || ' ' ||
        coalesce(NEW.evento, '')
    );
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualiza_titulo_tsv
BEFORE INSERT OR UPDATE ON producoes
FOR EACH ROW EXECUTE FUNCTION atualiza_titulo_tsv();

CREATE INDEX IF NOT EXISTS idx_producoes_titulo_tsv ON producoes USING GIN (titulo_tsv);