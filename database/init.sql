-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Criar tabelas que não possuem dependências (FKs) primeiro
CREATE TABLE INSTITUICOES (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    sigla VARCHAR(50),
    estado VARCHAR(50)
);

CREATE TABLE AREAS_CONHECIMENTO (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    grande_area VARCHAR(255)
);

-- 3. Criar a tabela de PESQUISADORES (depende de Instituições)
CREATE TABLE PESQUISADORES (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    lattes_id VARCHAR(50),
    email VARCHAR(255),
    instituicao_id BIGINT REFERENCES INSTITUICOES(id),
    area_atuacao VARCHAR(255),
    resumo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Criar a tabela de PRODUCOES (depende de Pesquisadores)
CREATE TABLE PRODUCOES (
    id BIGSERIAL PRIMARY KEY,
    pesquisador_id BIGINT REFERENCES PESQUISADORES(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    tipo_producao VARCHAR(100),
    doi VARCHAR(100),
    revista VARCHAR(255),
    evento VARCHAR(255),
    ano INTEGER,
    resumo TEXT,
    palavras_chave TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Criar a tabela de VETORES (depende de Produções)
CREATE TABLE VETORES (
    id BIGSERIAL PRIMARY KEY,
    producao_id BIGINT UNIQUE REFERENCES PRODUCOES(id) ON DELETE CASCADE,
    embedding VECTOR(1536), -- Ajuste o número se usar outro modelo que não OpenAI
    modelo_embedding VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de ligação (Muitos-para-Muitos)
CREATE TABLE PESQUISADOR_AREAS (
    pesquisador_id BIGINT REFERENCES PESQUISADORES(id) ON DELETE CASCADE,
    area_id BIGINT REFERENCES AREAS_CONHECIMENTO(id) ON DELETE CASCADE,
    PRIMARY KEY (pesquisador_id, area_id)
);

-- ==========================================
-- CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- ==========================================

-- Habilitar RLS em todas
ALTER TABLE INSTITUICOES ENABLE ROW LEVEL SECURITY;
ALTER TABLE AREAS_CONHECIMENTO ENABLE ROW LEVEL SECURITY;
ALTER TABLE PESQUISADORES ENABLE ROW LEVEL SECURITY;
ALTER TABLE PRODUCOES ENABLE ROW LEVEL SECURITY;
ALTER TABLE VETORES ENABLE ROW LEVEL SECURITY;
ALTER TABLE PESQUISADOR_AREAS ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso (Apenas Leitura Pública para este exemplo)
CREATE POLICY "Acesso público de leitura" ON INSTITUICOES FOR SELECT USING (true);
CREATE POLICY "Acesso público de leitura" ON AREAS_CONHECIMENTO FOR SELECT USING (true);
CREATE POLICY "Acesso público de leitura" ON PESQUISADORES FOR SELECT USING (true);
CREATE POLICY "Acesso público de leitura" ON PRODUCOES FOR SELECT USING (true);
CREATE POLICY "Acesso público de leitura" ON VETORES FOR SELECT USING (true);
CREATE POLICY "Acesso público de leitura" ON PESQUISADOR_AREAS FOR SELECT USING (true);