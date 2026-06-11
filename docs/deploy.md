# Deploy do LattesHub

Este guia prepara um deploy reproduzivel do LattesHub usando Docker Compose em uma VM, VPS ou servidor institucional. Ele cobre frontend Angular, backend FastAPI, PostgreSQL com pgvector, ETL Apache Hop e embeddings.

## Estrategia escolhida

A estrategia principal desta etapa e um deploy self-hosted com Docker Compose:

```text
Internet
  -> frontend Nginx :8080
  -> /api/ proxy interno
  -> backend FastAPI :8000
  -> PostgreSQL + pgvector na rede interna
```

Tradeoffs:

* Mantem PostgreSQL com pgvector e Apache Hop no mesmo modelo usado pelo projeto local.
* Evita expor o banco de dados publicamente por padrao.
* Permite rodar ETL e embeddings no mesmo host quando necessario.
* Exige que a equipe cuide de backup, TLS, firewall, atualizacao do host e observabilidade.
* Nao substitui uma arquitetura gerenciada em Supabase/Vercel/servicos equivalentes, que sera avaliada na issue #72.

## Pre-requisitos

No host de deploy:

* Docker Engine e Docker Compose Plugin instalados.
* Acesso ao repositorio.
* Porta publica para o frontend, por padrao `8080`.
* DNS/TLS configurado em um proxy externo, se o ambiente exigir HTTPS.
* Chave `OPENAI_API_KEY` valida apenas se embeddings precisarem ser gerados.

## Variaveis de ambiente

Crie o arquivo de producao a partir do exemplo:

```bash
cp .env.production.example .env.production
```

Edite `.env.production`:

* `DB_USER`, `DB_PASSWORD`, `DB_NAME`: credenciais do PostgreSQL interno.
* `DB_HOST=db` e `DB_PORT=5432`: valores esperados quando o backend usa o servico Postgres do compose.
* `DATABASE_URL`: opcional, para apontar o backend para um Postgres externo.
* `APP_ENV=production`: ativa validacoes de producao no backend.
* `BACKEND_CORS_ORIGINS`: origem publica permitida, por exemplo `https://latteshub.example.com`.
* `FRONTEND_PORT`: porta publicada pelo Nginx do frontend no host.
* `OPENAI_API_KEY`: chave usada pelo servico de embeddings.

Nao use `*` em `BACKEND_CORS_ORIGINS` em producao.

## Subir a aplicacao

Valide a configuracao final do Compose:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
```

Construa as imagens:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build
```

Suba banco, backend e frontend:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d db backend frontend
```

O banco fica apenas na rede interna do Compose. O frontend publica `FRONTEND_PORT` e encaminha `/api/` para o backend interno.

## Carga inicial de dados

Na primeira subida, o Postgres executa `database/init.sql` automaticamente ao criar o volume `latteshub_prod_pg_data`.

Rode o ETL e embeddings quando houver XMLs/CSVs em `database/data/`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile etl up hop embeddings
```

Se quiser importar primeiro apenas o seed de embeddings ou regenerar vetores pendentes:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile etl run --rm embeddings
```

## Validacao pos-deploy

Verifique containers e healthchecks:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Verifique a API pelo proxy do frontend:

```bash
curl -fsS http://localhost:${FRONTEND_PORT:-8080}/api/v1/producoes/?pagina=1\&tamanho_pagina=1
```

Verifique o health check direto dentro da rede do Compose:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend python -c "import urllib.request; print(urllib.request.urlopen('http://localhost:8000/health-check').read().decode())"
```

Verifique dados minimos no banco:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as producoes from producoes;"'
docker compose --env-file .env.production -f docker-compose.prod.yml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as pesquisadores from pesquisadores;"'
docker compose --env-file .env.production -f docker-compose.prod.yml exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select count(*) as vetores from vetores;"'
```

Verifique no navegador:

* `http://<host>:<FRONTEND_PORT>/`
* Busca textual por um termo esperado, por exemplo `dengue`.
* Filtros da sidebar carregando instituicoes e areas.
* Detalhe de pesquisador, quando houver dados carregados.

## Backup e operacao

O volume `latteshub_prod_pg_data` guarda os dados do PostgreSQL. Defina backup do banco antes de considerar o deploy persistente:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > backup_latteshub.sql
```

Para atualizar a aplicacao:

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d db backend frontend
```

Para ver logs:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f frontend
```

## Limites conhecidos

* Este guia nao provisiona DNS, HTTPS, backup automatizado ou monitoramento.
* O backend nao e publicado diretamente no host; a rota publica recomendada e o proxy `/api/` do frontend.
* Banco gerenciado, CDN e deploy serverless devem ser avaliados separadamente na issue #72 para uma entrega publica mais robusta.
