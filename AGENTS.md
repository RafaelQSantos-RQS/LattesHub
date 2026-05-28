# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# Repository Guidelines

## Project Structure & Module Organization

LattesHub combines ETL, API, database, and web UI components. In this workspace, the source repository lives under `LattesHub/` and the wiki checkout should live beside it at `../LattesHub.wiki/`.

- `LattesHub/backend/`: FastAPI application. Main entrypoint is `backend/app/main.py`; API routes live in `backend/app/api/v1/endpoints/`, schemas in `backend/app/schemas/`, database helpers in `backend/app/core/`, and utility scripts in `backend/app/scripts/`.
- `LattesHub/frontend/`: Angular application. Source lives in `frontend/src/app/`, organized into `pages/`, `layout/`, `shared/`, and `services/`. Unit specs use `*.spec.ts`.
- `LattesHub/database/`: PostgreSQL build context, Apache Hop project metadata, and input datasets under `database/data/`.
- `LattesHub/docker-compose.yml`: local orchestration for PostgreSQL, FastAPI backend, and Apache Hop ETL.

## LattesHub Wiki Context

Treat the codebase as the source of truth when it conflicts with the wiki, but consult `../LattesHub.wiki/` before changing architecture, API contracts, ETL, embeddings, database schema, or backlog-related behavior. The wiki documents the intended product: a platform for search and analysis of scientific productions extracted from Curriculo Lattes XML files, with textual search, semantic search, REST APIs, an analytical UI, and future BI/CSV outputs.

The implemented stack is:

- Data ingestion: Apache Hop pipelines and workflows under `LattesHub/database/apache_hop/`, reading Lattes XML and Qualis CAPES CSV input from `LattesHub/database/data/`.
- Database: PostgreSQL with `pgvector`, initialized by `LattesHub/database/init.sql`.
- Backend: Python + FastAPI, exposed under `/api/v1`.
- Frontend: Angular 21 + Tailwind CSS, using standalone-style components and signals.
- Infrastructure: Docker Compose services for `db`, `backend`, and profile-gated `hop` ETL.

The main data flow is:

```text
Lattes XML / Qualis CSV
  -> Apache Hop ETL
  -> PostgreSQL + pgvector
  -> FastAPI backend
  -> Angular frontend
```

The core schema currently centers on `instituicoes`, `pesquisadores`, `areas_conhecimento`, `pesquisador_areas`, `producoes`, `vetores`, and `qualis_periodicos`. Embeddings use OpenAI `text-embedding-3-small`, 1536 dimensions, stored in `vetores`, and are generated from production titles by `LattesHub/backend/app/scripts/gerar_embeddings.py`.

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

These items were found while comparing the wiki with the current code. Do not "fix" them incidentally; address them only when the task asks for documentation or implementation alignment.

- The wiki and root `README.md` mention Next.js in several places, but `frontend/package.json` and `frontend/README.md` show the current frontend is Angular 21.
- The API wiki documents `GET /instituicoes/{instituicao_id}/pesquisadores`, but the backend currently implements only institution details and institution productions for that sub-resource area.
- The semantic architecture wiki describes an HNSW vector index, while `LattesHub/database/init.sql` currently creates an `ivfflat` index on `vetores.embedding`.
- The backlog includes backend tests and CSV/Power BI export deliverables, but no backend test suite or backend CSV exporter was found.
- The frontend currently has mock search results in `LattesHub/frontend/src/app/services/search.ts` and is not yet wired to the FastAPI search/listing endpoints.
- `LattesHub/backend/app/scripts/buscar_artigos.py` contains a hardcoded database password fallback; remove that in a focused security cleanup before treating the script as production-safe.

## Build, Test, and Development Commands

- `cd LattesHub && docker compose up -d db backend`: start database and API locally.
- `cd LattesHub && docker compose --profile etl up hop`: run the Apache Hop ETL job.
- `cd LattesHub/backend && pip install -r requirements.txt`: install backend dependencies.
- `cd LattesHub/backend && uvicorn app.main:app --reload`: run the FastAPI app in development.
- `cd LattesHub/frontend && npm install`: install frontend dependencies.
- `cd LattesHub/frontend && npm start`: run Angular dev server at `http://localhost:4200/`.
- `cd LattesHub/frontend && npm run build`: build the frontend into `dist/`.
- `cd LattesHub/frontend && npm test`: run frontend unit tests.

## Coding Style & Naming Conventions

Python code uses 4-space indentation, type hints where practical, and snake_case for modules, functions, and variables. Keep FastAPI routers focused by resource, matching the existing endpoint files such as `pesquisadores.py` and `producoes.py`.

Angular code uses TypeScript, standalone-style components, and kebab-case file names by feature, for example `result-card.ts`, `result-card.html`, and `result-card.scss`. Keep component styles colocated with their templates.

## Testing Guidelines

Frontend tests are colocated as `*.spec.ts` under `frontend/src/app/`. Add or update specs when changing services, routing behavior, or component logic. Backend tests are not currently established; when adding them, prefer `pytest` under `backend/tests/` and cover endpoint behavior plus database edge cases.

## Commit & Pull Request Guidelines

Git history uses a mix of concise imperative commits and Conventional Commit prefixes, such as `feat(frontend): ...`, `build(docker): ...`, and `docs(frontend): ...`. Prefer that format for scoped changes.

Pull requests should include a short summary, affected areas (`backend`, `frontend`, `database`, `etl`), commands run, and any relevant screenshots for UI changes. Link related issues when available and mention required `.env` or Docker changes.

## Security & Configuration Tips

Keep secrets in `.env`; do not commit real `OPENAI_API_KEY` or production database passwords. Inside Docker, services should connect to PostgreSQL with `DB_HOST=db` and `DB_PORT=5432`; host-only access uses `DB_PORT_EXTERNAL`.
