# AGENTS.md

Guidelines for agents working on LattesHub. This file is the single source of truth for project instructions and is tracked in the code repository.

## Usage Scope

- Open Codex/agents from the `LattesHub/` repository root, or from one of its subdirectories, so this file is loaded automatically.
- The parent folder name is not important. What matters is that the code repository and optional wiki checkout are sibling directories:

```text
any-parent-folder/
  LattesHub/
    AGENTS.md
  LattesHub.wiki/
```

- The wiki checkout is optional and must be detected relative to this repository as `../LattesHub.wiki/`.
- If `../LattesHub.wiki/` exists, consult it before changing architecture, API contracts, ETL, embeddings, database schema, backlog behavior, or documentation.
- If `../LattesHub.wiki/` does not exist, continue using the codebase as the source of truth and mention that the wiki was unavailable when it matters to the task.
- Do not assume the wiki exists in another path without verifying it.
- If an agent is opened from the parent folder and there is no `AGENTS.md` there, this repository file may not be loaded automatically.

## 1. Think Before Coding

**Do not assume. Do not hide confusion. Surface tradeoffs.**

Before implementing:

- State assumptions explicitly when they affect the implementation.
- If multiple interpretations exist, present them instead of silently choosing.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear and cannot be discovered from the repo, stop and ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that was not requested.
- No error handling for impossible scenarios.
- If a solution is much larger than the problem requires, simplify it.

Ask yourself: would a senior engineer say this is overcomplicated? If yes, simplify.

## 3. Surgical Changes

**Touch only what is needed. Clean up only your own mess.**

When editing existing code:

- Do not improve adjacent code, comments, or formatting incidentally.
- Do not refactor things that are not broken.
- Match existing style, even if you would choose differently.
- If you notice unrelated dead code, mention it instead of deleting it.

When your changes create orphans:

- Remove imports, variables, and functions that your changes made unused.
- Do not remove pre-existing dead code unless asked.

Every changed line should trace directly to the user request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" -> write tests for invalid inputs, then make them pass.
- "Fix the bug" -> write or identify a reproduction, then make it pass.
- "Refactor X" -> ensure relevant behavior still passes after the change.

For multi-step tasks, state a brief plan:

```text
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria require clarification.

## 5. Proactive Operational Notes

**Capture lessons that prevent repeated mistakes.**

When a task reveals an operational detail, environment behavior, verification trap, or workflow constraint that is likely to matter again, add a concise note to this `AGENTS.md` automatically. Keep the note close to the relevant section, make it specific to the observed behavior, and avoid broad policy changes. Do this without waiting for the user to ask when the note would have prevented confusion or rework in the current task.

At the start of each working session, check whether the root `README.md` still matches the current project state. Compare it against the codebase and, when available, `../LattesHub.wiki/` for commands, URLs, stack, API access, frontend/backend startup flow, environment variables, and implemented features. If the README is stale and the current task touches related behavior or documentation, update it as part of the task; otherwise mention the drift instead of silently ignoring it.

When completing any issue or feature that changes user-facing behavior, API contracts, local setup, development commands, deployment steps, exported artifacts, or major project capabilities, update `README.md` in the same change if that information belongs there. Do not add noisy implementation details, but make sure future users can run, access, and understand the relevant feature from the README.

## Project Structure

LattesHub combines ETL, API, database, and web UI components.

- `backend/`: FastAPI application. Main entrypoint is `backend/app/main.py`; API routes live in `backend/app/api/v1/endpoints/`, schemas in `backend/app/schemas/`, database helpers in `backend/app/core/`, and utility scripts in `backend/app/scripts/`.
- `frontend/`: Angular application. Source lives in `frontend/src/app/`, organized into `pages/`, `layout/`, `shared/`, and `services/`. Unit specs use `*.spec.ts`.
- `database/`: PostgreSQL build context, Apache Hop project metadata, and input datasets under `database/data/`.
- `docker-compose.yml`: local orchestration for PostgreSQL, FastAPI backend, Angular frontend, and Apache Hop ETL.

## LattesHub Context

The codebase is the source of truth when it conflicts with the wiki. The wiki, when available at `../LattesHub.wiki/`, documents the intended product: a platform for search and analysis of scientific productions extracted from Curriculo Lattes XML files, with textual search, semantic search, REST APIs, an analytical UI, and future BI/CSV outputs.

The implemented stack is:

- Data ingestion: Apache Hop pipelines and workflows under `database/apache_hop/`, reading Lattes XML and Qualis CAPES CSV input from `database/data/`.
- Database: PostgreSQL with `pgvector`, initialized by `database/init.sql`.
- Backend: Python + FastAPI, exposed under `/api/v1`.
- Frontend: Angular 21 + Tailwind CSS, using standalone-style components and signals.
- Infrastructure: Docker Compose services for `db`, `backend`, `frontend`, and profile-gated `hop` ETL.

The main data flow is:

```text
Lattes XML / Qualis CSV
  -> Apache Hop ETL
  -> PostgreSQL + pgvector
  -> FastAPI backend
  -> Angular frontend
```

The core schema currently centers on `instituicoes`, `pesquisadores`, `areas_conhecimento`, `pesquisador_areas`, `producoes`, `vetores`, and `qualis_periodicos`. Embeddings use OpenAI `text-embedding-3-small`, 1536 dimensions, stored in `vetores`, and are generated from production titles by `backend/app/scripts/gerar_embeddings.py`.

The implemented API routes are:

- `POST /api/v1/busca/semantica`
- `GET /api/v1/areas`
- `GET /api/v1/instituicoes`
- `GET /api/v1/instituicoes/{instituicao_id}`
- `GET /api/v1/instituicoes/{instituicao_id}/producoes`
- `GET /api/v1/pesquisadores`
- `GET /api/v1/pesquisadores/{pesquisador_id}`
- `GET /api/v1/pesquisadores/{pesquisador_id}/producoes`
- `GET /api/v1/producoes`
- `GET /api/v1/producoes/{producao_id}`

## Known Documentation Drift

These items were found while comparing the wiki with the current code. Do not fix them incidentally; address them only when the task asks for documentation or implementation alignment.

- The wiki and root `README.md` mention Next.js in several places, but `frontend/package.json` and `frontend/README.md` show the current frontend is Angular 21.
- The API wiki documents `GET /instituicoes/{instituicao_id}/pesquisadores`, but the backend currently implements only institution details and institution productions for that sub-resource area.
- The semantic architecture wiki describes an HNSW vector index, while `database/init.sql` currently creates an `ivfflat` index on `vetores.embedding`.
- The backlog includes backend tests and CSV/Power BI export deliverables, but no broad backend test suite or backend CSV exporter is established yet.
- `backend/app/scripts/buscar_artigos.py` contains a hardcoded database password fallback; remove that in a focused security cleanup before treating the script as production-safe.

## Open Issue Execution Queue

This queue reflects the open GitHub issues last organized on 2026-06-10. When the user asks "faca a proxima issue" or "prossiga para a proxima issue", use this queue directly instead of reanalyzing GitHub issues from scratch. Pick the first item that is not marked here as implemented or merged. If GitHub has clearly changed since this date, refresh the queue and update this section before starting work.

Ordering rule: complete Sprint 4 before Sprint 5. Within a sprint, do backend/API contract work before frontend integration, integration before UI filters/details, data exports before BI/dashboard work, and deploy/checklist/demo near the end.

### Current Next-Issue Queue

1. #42 Adicionar busca por Qualis na busca semantica.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: semantic search accepts `qualis_estrato`, enriches responses with Qualis fields when available, and Docker backend was rebuilt so Swagger shows the updated contract.
2. #28 Integrar o front com o back.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: Angular search/results flow consumes real FastAPI calls to semantic search and production listing endpoints, including textual fallback when semantic search is unavailable.
3. #31 Implementar filtros reais no frontend.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: frontend filters cover institution, area, production type, and year, with options loaded from real FastAPI endpoints and filters sent to the backend.
4. #35 Criar tela ou painel de detalhes do pesquisador.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status note: implemented and merged on 2026-06-10 in PR #47.
   - Verification: users can navigate from search/listing views to researcher details and researcher productions.
5. #36 Completar exportacao CSV dimensional para Power BI.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09.
   - Verification: generated CSVs include the dimensional fields expected by the Power BI dashboard.
6. #34 Criar dashboard Power BI com KPIs e segmentacoes.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09.
   - Verification: KPIs, slicers, and relationships work using the exported CSV data.
7. #43 Preparar deploy do backend, frontend e banco.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09.
   - Verification: environment variables, Docker/database configuration, and deployment path cover backend, frontend, and PostgreSQL.
8. #37 Consolidar checklist de entrega final.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09.
   - Verification: implementation, documentation, deployment, and demo artifacts are accounted for.
9. #32 Gravar e publicar video de demonstracao da solucao.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09.
   - Verification: recorded flow demonstrates search, filters, details, BI outputs, and deployment state.

## Build, Test, and Development Commands

- `docker compose up -d`: start database, API, and frontend locally. The frontend container serves the production Angular build through Nginx at `http://localhost:4200/` by default.
- `docker compose up -d --build frontend`: rebuild and restart the frontend container after frontend changes when using Docker Compose.
- `docker compose up -d --build backend`: rebuild and restart the FastAPI backend after code changes when using Docker Compose. The backend service copies source files into the image and does not mount the local `backend/` directory as a live volume, so Swagger/OpenAPI at `http://localhost:8000/docs` keeps showing the old contract until the backend image/container is rebuilt.
- `docker compose --profile etl up hop`: run the Apache Hop ETL job.
- If frontend filters and production search are empty, first verify database counts; an empty `producoes` or `instituicoes` table means the Hop ETL did not populate the database. The Hop container fails on Windows CRLF shell scripts, so keep `database/apache_hop/docker/*.sh` as LF; `.gitattributes` enforces this for `*.sh`.
- Semantic search requires rows in `vetores`. If `vetores` is empty, the backend returns semantic search as unavailable and the frontend should fall back to textual `/producoes` search until embeddings are generated. Use `docker compose --profile etl run --rm embeddings`; the script imports `database/seed/vetores_seed.csv` first and only calls OpenAI for missing vectors, then rewrites the seed for future machines.
- `cd backend && pip install -r requirements.txt`: install backend dependencies.
- `cd backend && uvicorn app.main:app --reload`: run the FastAPI app in development.
- `cd frontend && npm install`: install frontend dependencies.
- `cd frontend && npm start`: run the Angular dev server at `http://localhost:4200/` outside Docker; stop the compose frontend first or change `FRONTEND_PORT` if port 4200 is already in use.
- `cd frontend && npm run build`: build the frontend into `dist/`.
- `cd frontend && npm test`: run frontend unit tests.
- On Windows PowerShell, use `npm.cmd` instead of `npm` when execution policy blocks `npm.ps1`. In the managed sandbox, Angular build/test may also fail with `Cannot read directory "../../../../../..": Access is denied`; rerun the same `npm.cmd run build` or `npm.cmd test` command with sandbox escalation instead of changing project paths.

## Coding Style

Python code uses 4-space indentation, type hints where practical, and snake_case for modules, functions, and variables. Keep FastAPI routers focused by resource, matching the existing endpoint files such as `pesquisadores.py` and `producoes.py`.

Angular code uses TypeScript, standalone-style components, and kebab-case file names by feature, for example `result-card.ts`, `result-card.html`, and `result-card.scss`. Keep component styles colocated with their templates.

## Testing Guidelines

Frontend tests are colocated as `*.spec.ts` under `frontend/src/app/`. Add or update specs when changing services, routing behavior, or component logic.

Backend tests are not broadly established; when adding them, prefer `pytest` under `backend/tests/` and cover endpoint behavior plus database edge cases.

When integrating frontend search with backend semantic search, verify the browser flow with a real query such as `dengue`. The semantic endpoint depends on `OPENAI_API_KEY`; if the key is invalid or unavailable, the frontend must still degrade gracefully to a real backend textual search (`/api/v1/producoes/?termo=...`) instead of showing a generic failure state.

## Commit, PR, and Wiki Workflow

Git history uses a mix of concise imperative commits and Conventional Commit prefixes, such as `feat(frontend): ...`, `build(docker): ...`, and `docs(frontend): ...`. Prefer that format for scoped changes.

Pull requests should include a short summary, affected areas (`backend`, `frontend`, `database`, `etl`), commands run, and any relevant screenshots for UI changes. Link related issues when available and mention required `.env` or Docker changes.

After using the `$gh-create-pr` skill to open a PR in the code repository, check whether related documentation changes exist in `../LattesHub.wiki/`. If they do, commit and push them directly to the wiki's main branch (`master` in the current checkout), because GitHub wikis are separate repositories and do not go through the code PR. If the wiki remote rejects the push, run `git pull --rebase origin master`, resolve conflicts by preserving remote updates plus the local documentation change, then push again.

## Security and Configuration

Keep secrets in `.env`; do not commit real `OPENAI_API_KEY` or production database passwords. Inside Docker, services should connect to PostgreSQL with `DB_HOST=db` and `DB_PORT=5432`; host-only access uses `DB_PORT_EXTERNAL`.
