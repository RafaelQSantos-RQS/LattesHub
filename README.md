# LattesHub

# Sistema de Busca de Pesquisadores com Full-Text Search e IA

Sistema acadêmico para extração, indexação e busca inteligente de produções científicas a partir do Currículo Lattes (XML), utilizando Full-Text Search, embeddings vetoriais e LLMs.

## Documentação completa com detalhes: https://github.com/RafaelQSantos-RQS/LattesHub/wiki

---

O projeto realiza:

* Extração de dados XML do Currículo Lattes, incluindo artigos, trabalhos em eventos, livros e capítulos;
* Processo ETL com Apache Hop;
* Armazenamento relacional no PostgreSQL;
* Busca textual com PostgreSQL Full-Text Search;
* Busca semântica com pgvector + embeddings;
* API REST com FastAPI;
* Interface web em Angular;
* Exportação CSV para Power BI.

---

# Arquitetura

```text
XML Lattes
    ↓
Apache Hop (ETL)
    ↓
PostgreSQL + pgvector
    ↓
FastAPI + OpenAI embeddings
    ↓
Angular Front-end
    ↓
Power BI

```

---

# Stack Tecnológica

| Camada           | Tecnologia              |
| ---------------- | ----------------------- |
| Infraestrutura   | Docker + Docker Compose |
| Banco Relacional | PostgreSQL              |
| Banco Vetorial   | pgvector                |
| Back-end         | Python + FastAPI        |
| IA / Embeddings  | OpenAI + pgvector       |
| Front-end        | Angular + TailwindCSS   |
| ETL              | Apache Hop              |
| BI               | Power BI                |

---

# Funcionalidades

* Busca textual por títulos científicos;
* Busca semântica utilizando IA;
* Indexação vetorial de produções elegíveis com título, tipo, natureza, veículo/evento, áreas e palavras-chave;
* API REST desacoplada;
* Dashboard analítico via Power BI;
* Pipeline ETL automatizado;
* Exportação CSV multidimensional.

---

# Acesso rapido

Depois de iniciar os servicos locais, use os enderecos abaixo:

| Recurso | URL padrao | Observacao |
| --- | --- | --- |
| Frontend Angular | `http://localhost:4200/` | Sobe pelo `docker compose up` ou, em desenvolvimento, por `cd frontend && npm install && npm start`. |
| Swagger UI | `http://localhost:8000/docs` | Documentacao interativa da API FastAPI. |
| ReDoc | `http://localhost:8000/redoc` | Documentacao alternativa gerada pelo OpenAPI. |
| API v1 | `http://localhost:8000/api/v1` | Prefixo base dos endpoints REST. |
| Health check | `http://localhost:8000/health-check` | Verificacao simples de disponibilidade da API. |
| PostgreSQL local | `localhost:5437` | Porta padrao de `.env.example` via `DB_PORT_EXTERNAL`. |

Se `FRONTEND_PORT`, `BACKEND_PORT` ou `DB_PORT_EXTERNAL` forem alterados no `.env`, ajuste as URLs acima para as portas configuradas.

---

# Busca e filtros

Os resultados em `/explorar` consomem a API em `/api/v1`. A listagem `GET /api/v1/producoes` aceita filtros combinados por `termo`, `tipo_producao`, `ano`, `ano_inicio`, `ano_fim`, `instituicao_id` e `areas`. O endpoint `POST /api/v1/busca/semantica` preserva `ano` como filtro exato e tambem aceita `ano_inicio`/`ano_fim` para intervalo.

Os tipos de producao exibidos no frontend sao carregados dinamicamente de `GET /api/v1/producoes/tipos`, refletindo os tipos reais presentes no banco. As abas da pagina Explorar usam `categoria` na URL: `tudo` lista producoes, `pesquisadores` lista pesquisadores, `artigos` filtra `ARTIGO PUBLICADO` e `eventos` filtra `TRABALHO EM EVENTOS`.

---

# Exportacoes CSV e Power BI

O endpoint `GET /api/v1/exportacoes/producoes.csv` gera um CSV analitico para Power BI, Python ou planilhas. O arquivo inclui campos de fato e dimensoes como producao, ano, quadrienio-ano, pesquisador, instituicao, areas, Qualis e metadados bibliograficos enriquecidos.

A exportacao aceita os filtros `termo`, `tipo_producao`, `ano`, `ano_inicio`, `ano_fim`, `instituicao_id` e `areas`, os mesmos filtros principais usados na listagem de producoes. Na pagina Explorar, o botao "Exportar Dados Analiticos (CSV)" baixa o CSV respeitando os filtros atuais da URL. Quando a busca visual vem de consulta semantica, o CSV usa o texto da busca como filtro textual (`termo`) e nao reproduz a ordenacao vetorial por similaridade.

Na pagina Indicadores, o botao "Exportar CSV" baixa o dataset completo de producoes.

---

# Getting Started (Como rodar o projeto)

A infraestrutura do LattesHub é totalmente orquestrada via Docker. Siga os passos abaixo para inicializar o ambiente com a carga de dados completa.

### Passo 0: Pré-requisitos e Configuração

1. Faça o clone do repositório.
2. Crie o arquivo de variáveis de ambiente a partir do exemplo:
```bash
cp .env.example .env

```


3. Preencha a variável `OPENAI_API_KEY` dentro do arquivo `.env` com a sua chave válida da OpenAI.
4. **(Apenas para usuários Windows):** Para evitar problemas de execução (CRLF vs LF) nos scripts bash do Apache Hop dentro do container Linux, execute o comando abaixo no seu terminal antes de realizar novos *pulls* ou *commits*:
```bash
git config --global core.autocrlf false

```



### Passo 1: Subindo a infraestrutura e executando o pipeline ETL (Carga Inicial)

Para construir as imagens e rodar o pipeline completo de ponta a ponta (Banco > API > Frontend > ETL > Embeddings), execute o comando na raiz do projeto:

```bash
docker compose --profile etl up --build

```

**O que este comando faz de forma orquestrada:**

1. Inicia o **PostgreSQL** (com a extensão pgvector).
2. Inicia o **Backend** (FastAPI) na porta 8000.
3. Inicia o **Frontend** (Angular servido por Nginx) na porta 4200.
4. Executa o serviço **Apache Hop** (`latteshub-etl`), que extrai as informações dos XMLs e as popula no banco de dados.
5. Ao finalizar o ETL com sucesso, executa o serviço de **Embeddings** (`latteshub-embeddings`), que primeiro tenta importar o seed versionado `database/seed/vetores_seed.csv`. Se ainda houver produções elegíveis sem vetor, gera apenas o delta chamando a API da OpenAI, salva no banco e reexporta o seed.

### Cobertura do ETL e embeddings

O workflow Apache Hop importa produções bibliográficas de artigos publicados, trabalhos em eventos, livros publicados/organizados e capítulos de livro. Cada pipeline usa `pesquisador_id`, `tipo_producao` e `titulo` como chave de idempotência para evitar duplicar linhas entre execuções ou entre tipos diferentes.

Por padrão, o serviço de embeddings processa os tipos `ARTIGO PUBLICADO`, `TRABALHO EM EVENTOS`, `LIVRO PUBLICADO` e `CAPITULO DE LIVRO`. O texto enviado ao modelo `text-embedding-3-small` combina título, título em inglês, tipo, natureza, ano, idioma, revista/veículo, evento, áreas do pesquisador e palavras-chave quando esses campos existem. Para restringir a cobertura, defina `EMBEDDING_PRODUCTION_TYPES` no `.env` com uma lista separada por vírgula.

### Passo 2: Desenvolvimento no dia a dia

Após a carga inicial de dados ter sido concluída (Passo 1), você não precisa rodar o pipeline de ETL e gastar requisições da OpenAI a cada vez que for programar.

Para subir os servicos persistentes (Banco de Dados, API backend e frontend) no dia a dia, utilize:

```bash
docker compose up

```

Com os containers ativos, o frontend fica disponivel em `http://localhost:4200/`, o backend em `http://localhost:8000`, e o Swagger em `http://localhost:8000/docs`.

Para rodar a interface web fora do Docker, com live reload do Angular, abra outro terminal e execute:

```bash
cd frontend
npm install
npm start

```

A aplicacao ficara disponivel em `http://localhost:4200/` e consumira a API pelo caminho relativo `/api/v1`, usando o proxy do Angular para `http://localhost:8000` por padrao.

Se o backend local estiver em outro host ou porta, defina `LATTESHUB_API_PROXY_TARGET` antes do `npm start`:

```bash
LATTESHUB_API_PROXY_TARGET=http://localhost:9000 npm start
```

No Docker Compose, o Nginx do frontend encaminha `/api/` diretamente para o servico `backend:8000` na rede interna. Em deploy, publique backend e frontend sob o mesmo dominio ou configure o proxy externo para encaminhar `/api/` ao backend.

Para preparar um deploy reproduzivel em VM/VPS/servidor com Docker Compose, use o guia [docs/deploy.md](docs/deploy.md). Ele cobre `.env.production`, `docker-compose.prod.yml`, carga inicial, ETL, embeddings e validacao pos-deploy.

Quando alterar codigo do backend usando Docker Compose, reconstrua a imagem para refletir as mudancas no container:

```bash
docker compose up -d --build backend

```

Quando alterar codigo do frontend usando Docker Compose, reconstrua a imagem do frontend:

```bash
docker compose up -d --build frontend
```

O Nginx do container frontend serve `index.html` e rotas da SPA sem cache para que novas builds aparecam com refresh normal da pagina. Arquivos estaticos versionados (`.js`, `.css`, imagens e fontes) continuam com cache longo porque o build Angular gera nomes com hash.

### Configuracao de CORS do backend

O backend aceita por padrao as origens locais `http://localhost:4200` e `http://127.0.0.1:4200`. Para deploy, configure `BACKEND_CORS_ORIGINS` no `.env` com a lista de origens permitidas, separadas por virgula, e use `APP_ENV=production`.

Exemplo:

```bash
APP_ENV=production
BACKEND_CORS_ORIGINS=https://seu-frontend.example.com
```

Nao use `*` em `BACKEND_CORS_ORIGINS` em producao, porque o backend habilita credenciais no CORS.

### Testes automatizados do backend

Os testes do backend usam `pytest`, `TestClient` do FastAPI e um PostgreSQL real. A suite cria dados minimos com prefixo `PYTEST_ISSUE30_` e remove esses dados ao final, sem depender do conteudo carregado pelo ETL. A chamada para OpenAI e mockada nos testes de busca semantica.

Para rodar localmente com Docker:

```bash
docker compose up -d db
docker compose run --rm backend pytest

```

Para rodar contra Supabase ou outro banco de teste externo, defina `DATABASE_URL` com uma credencial de ambiente de teste antes de executar o pytest. Nao use banco de producao, porque a suite insere e remove fixtures.

```bash
DATABASE_URL="<url-do-postgres-de-teste>" pytest

```

Smoke tests opcionais para banco externo podem ser executados com:

```bash
RUN_SUPABASE_SMOKE=1 DATABASE_URL="<url-do-postgres-de-teste>" pytest -m supabase

```

### Testes e build do frontend

Na pasta `frontend/`, use:

```bash
npm install
npm test
npm run build

```

No Windows PowerShell, se `npm` for bloqueado por politica de execucao do `npm.ps1`, use `npm.cmd` nos mesmos comandos, por exemplo `npm.cmd test`.

### Solucao de problemas: busca ou filtros vazios

Se o frontend abrir, mas a busca mostrar "Nenhum resultado encontrado" e os filtros estiverem vazios, diferencie primeiro falha de API/proxy de banco sem dados:

```bash
curl http://localhost:8000/api/v1/producoes/?pagina=1\&tamanho_pagina=1
curl http://localhost:4200/api/v1/producoes/?pagina=1\&tamanho_pagina=1
docker compose logs --tail=120 backend
```

Se a API direta falhar ou o frontend retornar `502 Bad Gateway`, o problema esta no backend/proxy, nao nos dados. Reinicie ou reconstrua o backend depois de alteracoes:

```bash
docker compose up -d --build backend
```

Se a API responder, verifique se o ETL populou o banco:

```bash
docker compose exec db psql -U postgres -d lattes_hub -c "select count(*) from producoes;"
```

Se o total for `0`, execute novamente a carga ETL:

```bash
docker compose --profile etl up --force-recreate hop
```

A busca semantica depende da tabela `vetores`. Se `select count(*) from vetores;` retornar `0`, execute:

```bash
docker compose --profile etl run --rm embeddings
```

Esse servico importa `database/seed/vetores_seed.csv` quando o arquivo existe. Assim, em outra maquina com o mesmo conjunto de XMLs, o banco pode ser populado com vetores sem gastar creditos da OpenAI novamente. A API da OpenAI so e chamada para producoes elegiveis que ainda nao tenham vetor no seed ou no banco.

---

Projeto desenvolvido para fins acadêmicos e experimentação em IA aplicada à recuperação de informação científica.
