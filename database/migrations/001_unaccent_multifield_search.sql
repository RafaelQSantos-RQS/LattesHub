-- Migration 001: unaccent + multi-field full-text search
-- Extends titulo_tsv to cover revista and evento fields, and enables accent-insensitive search.
-- Safe to run more than once (all statements are idempotent).

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Custom FTS configuration that strips accents before stemming
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_ts_config WHERE cfgname = 'portuguese_unaccent'
    ) THEN
        CREATE TEXT SEARCH CONFIGURATION portuguese_unaccent (COPY = portuguese);
        ALTER TEXT SEARCH CONFIGURATION portuguese_unaccent
            ALTER MAPPING FOR hword, hword_part, word
            WITH unaccent, portuguese_stem;
    END IF;
END $$;

-- Update trigger to index titulo + revista + evento
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

-- Rebuild all existing rows with the new config and fields
UPDATE producoes
SET titulo_tsv = to_tsvector('portuguese_unaccent',
    coalesce(titulo, '') || ' ' ||
    coalesce(revista, '') || ' ' ||
    coalesce(evento, '')
);
