# LattesHub

# Sistema de Busca de Pesquisadores com Full-Text Search e IA

Sistema acadêmico para extração, indexação e busca inteligente de produções científicas a partir do Currículo Lattes (XML), utilizando Full-Text Search, embeddings vetoriais e LLMs.

## Documentação completa com detalhes: https://github.com/RafaelQSantos-RQS/LattesHub/wiki

---

O projeto realiza:

* Extração de dados XML do Currículo Lattes, incluindo artigos, trabalhos em eventos, livros e capítulos;
* Processo ETL com Apache Hop;
* Armazenamento relacional no Supabase (PostgreSQL gerenciado);
* Busca textual com PostgreSQL Full-Text Search;
* Busca semântica com pgvector + embeddings;
* API REST com FastAPI;
* Interface web em Angular com múltiplas páginas (explorar, indicadores, agente, sobre);
* Agente de IA conversacional baseado na base de dados;
* Exportação CSV para Power BI e ferramentas analíticas.

---

# Arquitetura

```text
XML Lattes
    ↓
Apache Hop (ETL)
    ↓
Supabase (PostgreSQL + pgvector)
    ↓
FastAPI + OpenAI embeddings
    ↓
Angular Front-end (SPA)
    ↓
Power BI / CSV export
```

---

# Stack Tecnológica

| Camada           | Tecnologia              |
| ---------------- | ----------------------- |
| Infraestrutura   | Docker + Docker Compose |
| Banco Relacional | Supabase (PostgreSQL)   |
| Banco Vetorial   | pgvector (via Supabase) |
| Back-end         | Python + FastAPI        |
| IA / Embeddings  | OpenAI + pgvector       |
| Front-end        | Angular + SCSS          |
| ETL              | Apache Hop              |
| BI               | Power BI / CSV          |

---

# Funcionalidades

* Busca textual por títulos científicos (Full-Text Search);
* Busca semântica utilizando IA (pgvector + OpenAI);
* Agente conversacional de IA para perguntas sobre a base de dados (`/agente`);
* Painel de indicadores interativo com filtros por período, tipo, grande área, instituição e Qualis (`/indicadores`);
* Página de exploração de produções e pesquisadores com filtros facetados (`/explorar`);
* Páginas de detalhe de produção (`/producoes/:id`) e pesquisador (`/pesquisadores/:id`);
* Indexação vetorial de produções elegíveis com título, tipo, natureza, veículo/evento, áreas e palavras-chave;
* API REST desacoplada e documentada via Swagger/ReDoc;
* Exportação CSV multidimensional para Power BI.

---

# Páginas do Frontend

| Rota                   | Descrição                                                                      |
| ---------------------- | ------------------------------------------------------------------------------ |
| `/`                    | Home com estatísticas reais do banco e barra de busca.                         |
| `/explorar`            | Busca avançada com filtros, abas (tudo/pesquisadores/artigos/eventos) e paginação. |
| `/producoes/:id`       | Detalhe completo de uma produção científica.                                   |
| `/pesquisadores/:id`   | Perfil do pesquisador com suas produções.                                      |
| `/indicadores`         | Painel analítico com KPIs, gráficos e filtros combinados.                      |
| `/agente`              | Agente de IA conversacional para consultas em linguagem natural.               |
| `/sobre`               | Informações sobre o projeto e a equipe.                                        |

---

# Acesso rápido

Depois de iniciar os serviços locais, use os endereços abaixo:

| Recurso | URL padrão | Observação |
| --- | --- | --- |
| Frontend Angular | `http://localhost:4200/` | Sobe pelo `docker compose up` ou, em desenvolvimento, por `cd frontend && npm install && npm start`. |
| Swagger UI | `http://localhost:8000/docs` | Documentação interativa da API FastAPI. |
| ReDoc | `http://localhost:8000/redoc` | Documentação alternativa gerada pelo OpenAPI. |
| API v1 | `http://localhost:8000/api/v1` | Prefixo base dos endpoints REST. |
| Health check | `http://localhost:8000/health-check` | Verificação simples de disponibilidade da API. |
| Dashboard BI (JupyterLab) | `http://localhost:8888/lab` | Sobe com `docker compose --profile analytics up analytics`. |
| Banco de dados | Painel do Supabase | Acesse via dashboard em supabase.com para inspecionar tabelas. |

Se `FRONTEND_PORT`, `BACKEND_PORT` ou `ANALYTICS_PORT` forem alterados no `.env`, ajuste as URLs acima para as portas configuradas.

---

# Deploy em Produção (Render + Supabase)

O projeto está implantado publicamente na plataforma **Render** (frontend + backend) com banco de dados gerenciado no **Supabase**.

| Serviço | URL pública |
| ------- | ----------- |
| **Frontend** | https://latteshub-frontend.onrender.com |
| **Backend (API)** | Servido internamente — acessado pelo frontend via `/api/v1` |
| **Banco de dados** | Supabase (PostgreSQL + pgvector) |

**Páginas disponíveis em produção:**

| Página | URL |
| ------ | --- |
| Home | https://latteshub-frontend.onrender.com/ |
| Explorar | https://latteshub-frontend.onrender.com/explorar |
| Indicadores | https://latteshub-frontend.onrender.com/indicadores |
| Agente IA | https://latteshub-frontend.onrender.com/agente |
| Sobre | https://latteshub-frontend.onrender.com/sobre |

> [!NOTE]
> O Render utiliza serviços gratuitos ("Free tier") que entram em modo de hibernação após inatividade. A primeira requisição pode levar até 60 segundos para o serviço acordar.

### Variáveis de ambiente necessárias no Render

Configure as seguintes variáveis de ambiente nos serviços do Render:

**Backend (Web Service):**

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Connection string do Supabase (Session Pooler, porta 5432) |
| `DB_SSLMODE` | `require` |
| `OPENAI_API_KEY` | Chave válida da OpenAI |
| `APP_ENV` | `production` |
| `BACKEND_CORS_ORIGINS` | `https://latteshub-frontend.onrender.com` |

**Frontend (Static Site ou Web Service com Nginx):**

| Variável | Descrição |
| --- | --- |
| `BACKEND_URL` | URL interna do backend no Render (ex: `http://latteshub-backend:8000`) |

Para instruções detalhadas de deploy com Docker Compose em servidor próprio (VM/VPS), consulte [docs/deploy.md](docs/deploy.md).

---

# Busca e filtros

Os resultados em `/explorar` consomem a API em `/api/v1`. A listagem `GET /api/v1/producoes` aceita filtros combinados por `termo`, `tipo_producao`, `ano`, `ano_inicio`, `ano_fim`, `instituicao_id`, `areas` e `qualis_estrato`. O endpoint `POST /api/v1/busca/semantica` preserva `ano` como filtro exato, também aceita `ano_inicio`/`ano_fim` para intervalo e aplica `qualis_estrato`, incluindo `Sem Qualis` para publicações sem correspondência Qualis.

Os tipos de produção exibidos no frontend são carregados dinamicamente de `GET /api/v1/producoes/tipos`, refletindo os tipos reais presentes no banco. As abas da página Explorar usam `categoria` na URL: `tudo` lista produções, `pesquisadores` lista pesquisadores, `artigos` filtra `ARTIGO PUBLICADO` e `eventos` filtra `TRABALHO EM EVENTOS`.

O Painel de Indicadores (`/indicadores`) consome `GET /api/v1/indicadores/resumo` e permite combinar filtros por período, tipo de produção e múltiplas seleções de grande área, instituição e Qualis; esses filtros são enviados como parâmetros repetidos na query e recalculam KPIs e gráficos dinamicamente.

---

# Exportações CSV e Power BI

O endpoint `GET /api/v1/exportacoes/producoes.csv` gera um CSV analítico para Power BI, Python ou planilhas. O arquivo inclui campos de fato e dimensões como produção, ano, quadriênio-ano, pesquisador, instituição, áreas, Qualis e metadados bibliográficos enriquecidos.

A exportação aceita os filtros `termo`, `tipo_producao`, `ano`, `ano_inicio`, `ano_fim`, `instituicao_id`, `areas` e `qualis_estrato`, os mesmos filtros principais usados na listagem de produções. Na página Explorar, o botão "Exportar Dados Analíticos (CSV)" baixa o CSV respeitando os filtros atuais da URL. Quando a busca visual vem de consulta semântica, o CSV usa o texto da busca como filtro textual (`termo`) e não reproduz a ordenação vetorial por similaridade.

Na página Indicadores, o botão "Exportar CSV" baixa o dataset completo de produções.

---

# Dashboard BI (JupyterLab)

O projeto inclui um dashboard analítico interativo em `analytics/dashboard_bi.ipynb`, disponível como serviço Docker via profile `analytics`. Ele consome o CSV gerado pelo backend e exibe KPIs, gráficos e tabelas de segmentação.

**Gráficos disponíveis:** KPI cards, produções ao longo do tempo, por tipo de produção, top 10 áreas de pesquisa, distribuição Qualis (A1–C), top 10 instituições, evolução por tipo (séries temporais).

**Segmentações:** configure as variáveis `FILTRO_ANO_INICIO`, `FILTRO_ANO_FIM`, `FILTRO_TIPO`, `FILTRO_PESQUISADOR`, `FILTRO_AREA` e `FILTRO_INSTITUICAO` na primeira célula do notebook e re-execute.

Para subir o serviço:

```bash
docker compose --profile analytics up analytics
```

Acesse em `http://localhost:8888/lab`, abra `dashboard_bi.ipynb` e clique em **Run → Run All Cells**.

Para usar com Power BI Desktop ou outra ferramenta de BI, baixe o CSV diretamente:

```
http://localhost:8000/api/v1/exportacoes/producoes.csv
```

---

# Getting Started (Como rodar o projeto)

A infraestrutura do LattesHub é orquestrada via Docker e usa o **Supabase** como banco de dados. Não é necessário rodar PostgreSQL localmente.

### Passo 0: Pré-requisitos e Configuração

1. Faça o clone do repositório.
2. Crie o arquivo de variáveis de ambiente a partir do exemplo:
```bash
cp .env.example .env
```

3. Preencha as variáveis obrigatórias no `.env`:

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Connection string do Supabase (Session Pooler, porta 5432) |
| `DB_SSLMODE` | Deve ser `require` para o Supabase |
| `OPENAI_API_KEY` | Chave válida da OpenAI |

A `DATABASE_URL` tem o formato:
```
postgresql://postgres.<project-ref>:<senha>@aws-X-sa-east-1.pooler.supabase.com:5432/postgres
```

4. **(Apenas para usuários Windows):** Para evitar problemas de execução (CRLF vs LF) nos scripts bash do Apache Hop dentro do container Linux, execute o comando abaixo no seu terminal antes de realizar novos *pulls* ou *commits*:
```bash
git config --global core.autocrlf false
```

### Passo 1: Subindo a infraestrutura e executando o pipeline ETL (Carga Inicial)

Para construir as imagens e rodar o pipeline completo de ponta a ponta (API > Frontend > ETL > Embeddings), execute o comando na raiz do projeto:

```bash
docker compose --profile etl up --build
```

**O que este comando faz de forma orquestrada:**

1. Inicia o **Backend** (FastAPI) na porta 8000, conectado ao Supabase via `DATABASE_URL`.
2. Inicia o **Frontend** (Angular servido por Nginx) na porta 4200.
3. Executa o serviço **Apache Hop** (`latteshub-etl`), que extrai as informações dos XMLs e as popula no banco de dados.
4. Ao finalizar o ETL com sucesso, executa o serviço de **Embeddings** (`latteshub-embeddings`), que primeiro tenta importar o seed versionado `database/seed/vetores_seed.csv`. Se ainda houver produções elegíveis sem vetor, gera apenas o delta chamando a API da OpenAI, salva no banco e reexporta o seed.

### Cobertura do ETL e embeddings

O workflow Apache Hop importa produções bibliográficas de artigos publicados, trabalhos em eventos, livros publicados/organizados e capítulos de livro. Cada pipeline usa `pesquisador_id`, `tipo_producao` e `titulo` como chave de idempotência para evitar duplicar linhas entre execuções ou entre tipos diferentes.

Por padrão, o serviço de embeddings processa os tipos `ARTIGO PUBLICADO`, `TRABALHO EM EVENTOS`, `LIVRO PUBLICADO` e `CAPITULO DE LIVRO`. O texto enviado ao modelo `text-embedding-3-small` combina título, título em inglês, tipo, natureza, ano, idioma, revista/veículo, evento, áreas do pesquisador e palavras-chave quando esses campos existem. Para restringir a cobertura, defina `EMBEDDING_PRODUCTION_TYPES` no `.env` com uma lista separada por vírgula.

### Passo 2: Desenvolvimento no dia a dia

Após a carga inicial de dados ter sido concluída (Passo 1), você não precisa rodar o pipeline de ETL e gastar requisições da OpenAI a cada vez que for programar.

Para subir os serviços persistentes (API backend e frontend) no dia a dia, utilize:

```bash
docker compose up
```

Com os containers ativos, o frontend fica disponível em `http://localhost:4200/`, o backend em `http://localhost:8000`, e o Swagger em `http://localhost:8000/docs`.

Para rodar a interface web fora do Docker, com live reload do Angular, abra outro terminal e execute:

```bash
cd frontend
npm install
npm start
```

A aplicação ficará disponível em `http://localhost:4200/` e consumirá a API pelo caminho relativo `/api/v1`, usando o proxy do Angular para `http://localhost:8000` por padrão.

Se o backend local estiver em outro host ou porta, defina `LATTESHUB_API_PROXY_TARGET` antes do `npm start`:

```bash
LATTESHUB_API_PROXY_TARGET=http://localhost:9000 npm start
```

No Docker Compose, o Nginx do frontend encaminha `/api/` diretamente para o serviço `backend:8000` na rede interna. Em deploy, publique backend e frontend sob o mesmo domínio ou configure o proxy externo para encaminhar `/api/` ao backend.

Para preparar um deploy reproduzível em VM/VPS/servidor com Docker Compose, use o guia [docs/deploy.md](docs/deploy.md). Ele cobre `.env.production`, `docker-compose.prod.yml`, carga inicial, ETL, embeddings e validação pós-deploy.

Quando alterar código do backend e do frontend ao mesmo tempo, reconstrua ambos com um único comando:

```bash
docker compose up -d --build frontend backend
```

Para reconstruir apenas o backend:

```bash
docker compose up -d --build backend
```

Para reconstruir apenas o frontend:

```bash
docker compose up -d --build frontend
```

O Nginx do container frontend serve `index.html` e rotas da SPA sem cache para que novas builds apareçam com refresh normal da página. Arquivos estáticos versionados (`.js`, `.css`, imagens e fontes) continuam com cache longo porque o build Angular gera nomes com hash.

### Banco de dados local (opcional)

Se precisar rodar um PostgreSQL local em vez do Supabase (por exemplo, para trabalhar offline), o serviço `db` está disponível via profile `local-db`:

```bash
docker compose --profile local-db up db
```

Nesse caso, ajuste o `.env` removendo `DATABASE_URL` e restaurando as variáveis individuais (`DB_HOST=db`, `DB_PORT=5432`, etc.).

### Configuração de CORS do backend

O backend aceita por padrão as origens locais `http://localhost:4200` e `http://127.0.0.1:4200`. Para deploy, configure `BACKEND_CORS_ORIGINS` no `.env` com a lista de origens permitidas, separadas por vírgula, e use `APP_ENV=production`.

Exemplo:

```bash
APP_ENV=production
BACKEND_CORS_ORIGINS=https://seu-frontend.example.com
```

Não use `*` em `BACKEND_CORS_ORIGINS` em produção, porque o backend habilita credenciais no CORS.

### Testes automatizados do backend

Os testes do backend usam `pytest`, `TestClient` do FastAPI e um PostgreSQL real. A suite cria dados mínimos com prefixo `PYTEST_ISSUE30_` e remove esses dados ao final, sem depender do conteúdo carregado pelo ETL. A chamada para OpenAI é mockada nos testes de busca semântica.

Para rodar os testes contra o Supabase (ou outro banco de teste externo), defina `DATABASE_URL` com uma credencial de ambiente de teste antes de executar o pytest. Não use o banco de produção, porque a suite insere e remove fixtures.

```bash
DATABASE_URL="<url-do-postgres-de-teste>" pytest
```

Smoke tests opcionais para banco externo podem ser executados com:

```bash
RUN_SUPABASE_SMOKE=1 DATABASE_URL="<url-do-postgres-de-teste>" pytest -m supabase
```

### Testes e build do frontend

O frontend requer **Node.js 24** (mesma versão do CI). O repositório fixa essa versão via `frontend/.nvmrc` e o campo `engines` do `package.json`; com [nvm](https://github.com/nvm-sh/nvm), basta rodar `nvm use` dentro de `frontend/`. Evite o Node 25: o ambiente de teste do Vitest não disponibiliza `localStorage` nessa versão, o que faz quase todos os specs falharem com erros encadeados de `TestBed` (`localStorage.getItem is not a function`, depois "test module has already been instantiated").

Na pasta `frontend/`, use:

```bash
nvm use        # seleciona o Node 24 do .nvmrc
npm install
npm test
npm run build
```

> Se trocar de versão do Angular (ou após um `git pull` que atualize `package.json`/`package-lock.json`), rode `npm ci` antes de buildar; um `node_modules` desatualizado causa erros de compilação como `Module '"@angular/common/http"' has no exported member 'withXhr'`.

No Windows PowerShell, se `npm` for bloqueado por política de execução do `npm.ps1`, use `npm.cmd` nos mesmos comandos, por exemplo `npm.cmd test`.

---

### Solução de problemas: busca ou filtros vazios

Se o frontend abrir, mas a busca mostrar "Nenhum resultado encontrado" e os filtros estiverem vazios, diferencie primeiro falha de API/proxy de banco sem dados:

```bash
curl http://localhost:8000/api/v1/producoes/?pagina=1&tamanho_pagina=1
curl http://localhost:4200/api/v1/producoes/?pagina=1&tamanho_pagina=1
docker compose logs --tail=120 backend
```

Se a API direta falhar ou o frontend retornar `502 Bad Gateway`, o problema está no backend/proxy, não nos dados. Reinicie ou reconstrua o backend depois de alterações:

```bash
docker compose up -d --build backend
```

Se a API responder, verifique se o ETL populou o banco:

**Supabase (padrão):** acesse o painel → Table Editor → `producoes`, ou use o SQL Editor:
```sql
SELECT count(*) FROM producoes;
```

**Banco local (`--profile local-db`):**
```bash
docker compose --profile local-db exec db psql -U postgres -d postgres -c "SELECT count(*) FROM producoes;"
```

Se o total for `0`, execute novamente a carga ETL:

```bash
docker compose --profile etl up --force-recreate hop
```

A busca semântica depende da tabela `vetores`. Se `SELECT count(*) FROM vetores;` retornar `0` (Supabase SQL Editor) ou o comando equivalente acima retornar `0`, execute:

```bash
docker compose --profile etl run --rm embeddings
```

Este serviço importa `database/seed/vetores_seed.csv` quando o arquivo existe. Assim, em outra máquina com o mesmo conjunto de XMLs, o banco pode ser populado com vetores sem gastar créditos da OpenAI novamente. A API da OpenAI só é chamada para produções elegíveis que ainda não tenham vetor no seed ou no banco.

---

Projeto desenvolvido para fins acadêmicos e experimentação em IA aplicada à recuperação de informação científica.
