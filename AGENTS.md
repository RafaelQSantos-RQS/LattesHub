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

## 5. GitHub Workflow

**Branch and commit freely. Never open a PR without explicit user instruction.**

- Always create a feature branch before committing — never commit directly to `main`.
- Commit and push the branch when the work is done.
- **Do not open a pull request automatically.** Wait for the user to say "open a PR", "create a PR", or invoke `/gh-create-pr`. Small fixes are often accumulated by the user into a single PR later.
- When asked to open a PR, follow the full `/gh-create-pr` skill workflow: meaningful branch name, labels, milestone, project, assignee (`brugabi`), and body.

## 6. Proactive Operational Notes

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
- `GET /api/v1/instituicoes/{instituicao_id}/pesquisadores`
- `GET /api/v1/instituicoes/{instituicao_id}/producoes`
- `GET /api/v1/pesquisadores`
- `GET /api/v1/pesquisadores/{pesquisador_id}`
- `GET /api/v1/pesquisadores/{pesquisador_id}/producoes`
- `GET /api/v1/producoes`
- `GET /api/v1/producoes/{producao_id}`
- `GET /api/v1/exportacoes/producoes.csv`

## Known Documentation Drift

These items were found while comparing the wiki with the current code. Do not fix them incidentally; address them only when the task asks for documentation or implementation alignment.

- The wiki mentions Next.js in several places, but `frontend/package.json`, `frontend/README.md`, and the root `README.md` show the current frontend is Angular 21.
- The semantic architecture wiki describes an HNSW vector index, while `database/init.sql` currently creates an `ivfflat` index on `vetores.embedding`.
- The root `README.md` presents the Power BI dashboard as a project capability, but issue #34 is still pending for that deliverable.

## Open Issue Execution Queue

This queue reflects the GitHub issues last organized on 2026-06-11. When the user asks "faca a proxima issue" or "prossiga para a proxima issue", use this queue directly instead of reanalyzing GitHub issues from scratch. Pick the first item that is not marked here as implemented, merged, or done. If GitHub has clearly changed since this date, refresh the queue and update this section before starting work.

Whenever an agent creates a GitHub issue for this repository, it must immediately assess impact and urgency, then insert the new issue into this cronograma in the same turn. Each queue item must include explicit status (`pending`, `in_progress`, `implemented`, `merged`, `blocked`, or `done`), impact, urgency, and verification. Do not leave newly created issues outside this section unless the issue is explicitly out of scope for LattesHub execution.

Ordering rule: security, data integrity, deploy blockers, and API/runtime reliability come first; then backend/API contracts; then ETL/embeddings/data quality; then frontend integration and UX bugs; then exports/BI; then deployment/checklist/demo. Within the same impact tier, prefer issues that unblock other issues or reduce demo risk.

Execution batching rule: do not default to one PR per issue. When several pending issues are closely related, implement them together on one branch and open one PR after the grouped work is complete and verified. Good batches are same-layer/same-surface changes, such as API reliability fixes, search/filter contract changes, result-card UX fixes, export/BI work, or final documentation/demo tasks. Keep a PR separate when the issue is security-sensitive, risky, likely to require rollback, changes deployment/infrastructure broadly, or would make the PR too large to review cleanly. When batching, list every covered issue in the PR body and update this queue's status notes for each issue.

Assignee and in_progress rule: at the start of each session or before starting a new PR batch, identify all issues that will be covered by that PR together and perform all three steps for each issue in the batch: (1) assign `brugabi` via `gh issue edit <number> --repo RafaelQSantos-RQS/LattesHub --add-assignee brugabi`; (2) update their status to `in_progress` in this queue; (3) update their status to "In Progress" in the GitHub Project board via `gh project item-edit --project-id PVT_kwHOBwOR284BW4pa --id <item-id> --field-id PVTSSF_lAHOBwOR284BW4pazhSJbE4 --single-select-option-id 47fc9ee4` — if an issue is not yet in the project, add it first with `gh project item-add 6 --owner RafaelQSantos-RQS --url https://github.com/RafaelQSantos-RQS/LattesHub/issues/<number>`. All three steps are mandatory for every batch. A batch is always multiple issues that form a coherent PR theme (e.g. "search quality", "frontend UX bugs", "ETL + embeddings"). Do not assign or mark `in_progress` for future batches — only the current one. A single-issue batch is only acceptable when that issue is explicitly isolated, security-sensitive, or risky enough to warrant a solo PR.

Before finalizing a batch, check each candidate issue for existing assignees via `gh issue view <number> --repo RafaelQSantos-RQS/LattesHub --json assignees`. If an issue already has any assignee other than `brugabi`, skip it entirely — do not include it in the batch, do not assign `brugabi`, and do not mark it `in_progress`. Mention the skipped issue to the user so they are aware a teammate has claimed it.

Batch completion handoff rule: when the last issue of the current batch is implemented and verified, explicitly tell the user that the batch is complete and suggest running `/gh-create-pr` (or the PR skill) to open the pull request. After the PR is created or the user confirms the batch is done, immediately identify the next batch from the queue, perform all three steps above for each issue in that next batch, and inform the user which issues were picked and why.

### Current Next-Issue Queue

1. #42 Adicionar busca por Qualis na busca semantica.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status: merged/done.
   - Impact: high; urgency: done reference.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: semantic search accepts `qualis_estrato`, enriches responses with Qualis fields when available, and Docker backend was rebuilt so Swagger shows the updated contract.
2. #28 Integrar o front com o back.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status: merged/done.
   - Impact: high; urgency: done reference.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: Angular search/results flow consumes real FastAPI calls to semantic search and production listing endpoints, including textual fallback when semantic search is unavailable.
3. #31 Implementar filtros reais no frontend.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status: merged/done.
   - Impact: high; urgency: done reference.
   - Status note: implemented and merged on 2026-06-10.
   - Verification: frontend filters cover institution, area, production type, and year, with options loaded from real FastAPI endpoints and filters sent to the backend.
4. #35 Criar tela ou painel de detalhes do pesquisador.
   - Milestone: Sprint 4 - Frontend. Original due date: 2026-06-02.
   - Status: merged/done.
   - Impact: high; urgency: done reference.
   - Status note: implemented and merged on 2026-06-10 in PR #47.
   - Verification: users can navigate from search/listing views to researcher details and researcher productions.
5. #60 bug(api/security): restringir CORS em producao.
   - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
   - Impact: critical; urgency: immediate.
   - Rationale: deploy/security risk because wildcard CORS with credentials can expose the API in production.
   - Status note: implemented on 2026-06-11; awaiting PR/merge.
   - Verification: `BACKEND_CORS_ORIGINS` configures allowed origins, `APP_ENV=production` rejects wildcard, local Angular origins remain allowed, blocked-origin preflight is tested, and backend pytest passed.
6. #61 bug(api): evitar conexoes idle in transaction no pool.
   - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
   - Impact: critical; urgency: immediate.
   - Rationale: database pool hygiene can affect reliability under repeated API calls.
   - Status note: implemented on 2026-06-11; awaiting PR/merge.
   - Verification: `get_db_connection` rolls back before returning healthy connections to the pool, broken cleanup discards the connection, a regression test checks `TRANSACTION_STATUS_IDLE`, and backend pytest passed.
7. #62 bug(api): padronizar erros 500 sem expor detalhes internos.
   - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
   - Impact: high; urgency: immediate.
   - Rationale: prevents leaking internal database/runtime details through API responses.
   - Status note: implemented on 2026-06-11; awaiting PR/merge.
   - Verification: internal HTTP 500 responses are sanitized by the FastAPI exception handler, technical details are logged server-side, a regression test verifies sensitive error text is absent from the client response, and backend pytest passed.
8. #64 bug(frontend): configurar base URL da API sem porta fixa.
   - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
   - Impact: high; urgency: immediate.
   - Rationale: deploy blocker when backend is not reachable at `hostname:8000`.
   - Status note: implemented on 2026-06-11; awaiting PR/merge.
   - Verification: frontend defaults to relative `/api/v1`, Angular dev server proxies `/api/` via configurable `LATTESHUB_API_PROXY_TARGET`, Docker Nginx proxies `/api/` to `backend:8000`, unit tests cover the default API base, and frontend tests/build passed.
9. #43 Preparar deploy do backend, frontend e banco.
   - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09. Status: implemented.
   - Impact: critical; urgency: immediate after #60/#64.
   - Rationale: final delivery depends on deployable backend, frontend, and PostgreSQL configuration.
   - Status note: implemented on 2026-06-11 with a self-hosted Docker Compose deployment baseline; awaiting PR/merge.
   - Verification: `docker-compose.prod.yml`, `.env.production.example`, and `docs/deploy.md` cover backend, frontend, PostgreSQL, ETL, embeddings, secrets, first load, validation, backup, and tradeoffs; production compose config passed with and without `--profile etl`; production db/backend/frontend builds passed.
10. #65 bug(frontend): evitar resultados fora de ordem em buscas rapidas.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: high; urgency: soon.
    - Rationale: stale async responses can make search results incorrect during demos and real use.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: `SearchService` cancels the previous active search subscription, guards state writes with the active search id, preserves semantic-to-textual fallback, and frontend tests/build passed.
11. #50 bug(search): permitir busca da home com menos de 5 caracteres.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: high; urgency: soon.
    - Rationale: blocks valid short textual searches even though `/producoes` accepts terms from two characters.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: home search button and submit accept terms from two characters, one-character terms remain blocked in the UI, 2-4 character queries use textual `/producoes?termo=...`, semantic search is reserved for 5+ character queries, and frontend tests/build passed.
12. #66 enhancement(search): melhorar busca textual com unaccent e multiplos campos.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: high; urgency: soon.
    - Rationale: improves literal search quality across title, researcher, venue, DOI, and accent variants.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: backend tests cover accented/unaccented terms and non-title fields.
    - Batch: search & browse quality PR (with #56, #68, #69).
13. #63 enhancement(semantic): gerar embeddings para mais tipos e texto mais rico.
    - Milestone: Sprint 5 - BI e Fechamento. Status: merged/done.
    - Impact: high; urgency: soon.
    - Rationale: semantic quality and coverage depend on embedding more than article titles.
    - Status note: implemented in PR #77 and merged on 2026-06-11; GitHub issue is closed and project item is Done.
    - Verification: embedding script processes configurable eligible production types with text composed from title, English title, type, nature, year, language, venue/event, researcher areas, and keywords while preserving the seed CSV format; backend pytest passed.
    - Batch: ETL + embeddings coverage PR (with #67).
14. #67 enhancement(etl): importar outros tipos de producao alem de artigos.
    - Milestone: Sprint 5 - BI e Fechamento. Status: merged/done.
    - Impact: high; urgency: soon.
    - Rationale: enables event/book/category filters and richer analytics beyond articles.
    - Status note: implemented in PR #77 and merged on 2026-06-11; GitHub issue is closed and project item is Done.
    - Verification: Hop pipelines import event papers, books, and book chapters; local smoke populated `TRABALHO EM EVENTOS` (321), `LIVRO PUBLICADO` (26), and `CAPITULO DE LIVRO` (80), then a second run kept counts stable; backend pytest passed.
    - Batch: ETL + embeddings coverage PR (with #63).
15. #54 enhancement(filters): tornar tipos de producao dinamicos e adicionar intervalo de anos.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: high; urgency: after #67 unless implemented with current data fallback.
    - Rationale: dynamic type filters and year ranges improve backend/frontend contract and analytics filtering.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: `/producoes` and `/busca/semantica` accept `ano_inicio`/`ano_fim`, preserve `ano`, and expose real production types via `/producoes/tipos`; focused backend pytest, frontend tests, frontend build, and `git diff --check` passed.
    - Batch: filters/explore PR (with #48).
16. #48 bug(frontend): aplicar abas de categoria na pagina Explorar.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: high; urgency: after #54/#67 where possible.
    - Rationale: visible tabs currently imply behavior that does not exist.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: category tabs update `categoria` query params and render Tudo, Pesquisadores, Artigos, and Eventos correctly; frontend tests/build passed.
    - Batch: filters/explore PR (with #54).
17. #56 bug(frontend): implementar paginacao real em Explorar.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: high; urgency: soon.
    - Rationale: current pagination controls are placeholders while backend already returns pagination metadata.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: page controls use `pagina`, `tamanho_pagina`, and `total`, preserving search and filters.
    - Batch: search & browse quality PR (with #66, #68, #69).
18. #55 enhancement(search): permitir busca por area e instituicao.
    - Milestone: Sprint 5 - BI e Fechamento. Status: pending/open.
    - Impact: medium-high; urgency: after core search/filter fixes.
    - Rationale: typeahead avoids unwieldy full lists and improves filter discovery.
    - Verification: users can search/select area and institution by text while query params keep stable IDs.
19. #68 bug(frontend): tratar falha ao carregar filtros da sidebar.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: medium-high; urgency: soon.
    - Rationale: filter load failures currently look like empty data.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: sidebar distinguishes loading, error, empty, and success states for areas/institutions.
    - Batch: search & browse quality PR (with #66, #56, #69).
20. #69 bug(frontend): nao exibir revista evento natureza como abstract.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: medium; urgency: soon.
    - Rationale: metadata is currently rendered as if it were an abstract/summary.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: result cards render source/venue metadata separately from true summaries.
    - Batch: search & browse quality PR (with #66, #56, #68).
21. #49 enhancement(frontend): abrir detalhes ao clicar no titulo de uma producao.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: medium-high; urgency: after result-card metadata cleanup if possible.
    - Rationale: titles look clickable but do not open the existing production detail endpoint.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: production titles navigate to a detail route/panel backed by `GET /api/v1/producoes/{id}`.
    - Batch: frontend UX fixes (with #71, #70).
22. #71 bug(frontend): botao Voltar aos resultados deve ter fallback.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: medium; urgency: soon.
    - Rationale: direct visits to researcher detail can make the back button leave the app.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: direct `/pesquisadores/:id` access falls back to `/explorar`.
    - Batch: frontend UX fixes (with #49, #70).
23. #70 bug(frontend): implementar ou remover acoes Cite e Share.
    - Milestone: Sprint 5 - BI e Fechamento. Status: done.
    - Impact: medium; urgency: later unless demo focuses on result cards.
    - Rationale: visible buttons currently have no behavior.
    - Status note: GitHub issue is closed and project item is Done as of 2026-06-11.
    - Verification: Cite/Share either work accessibly or are removed.
    - Batch: frontend UX fixes (with #49, #71).
24. #51 bug(frontend): corrigir navegacao por ancoras na pagina Sobre.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: medium; urgency: later.
    - Rationale: page-internal links should not navigate users away from `/sobre`.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: `/sobre#missao`, `/sobre#tecnologia`, and `/sobre#parceiros` scroll correctly.
25. #59 bug(frontend): corrigir links do footer.
    - Milestone: Sprint 5 - BI e Fechamento. Status: implemented.
    - Impact: medium; urgency: later.
    - Rationale: footer has placeholder links and external-link security gaps.
    - Status note: implemented on 2026-06-11; awaiting PR/merge.
    - Verification: no footer link uses `href="#"`; GitHub opens with `target="_blank"` and `rel="noopener noreferrer"`.
26. #52 bug(frontend): conectar botao Exportar CSV em Indicadores.
    - Milestone: Sprint 5 - BI e Fechamento. Status: merged/done.
    - Impact: medium-high; urgency: before BI/demo.
    - Rationale: backend CSV exists but the indicators button is visual only.
    - Status note: implemented in PR #79 and merged on 2026-06-11; GitHub issue is closed and project item is Done.
    - Verification: Indicators export button downloads `/api/v1/exportacoes/producoes.csv`, shows loading/error states, and frontend tests/build passed.
    - Batch: export/BI CSV PR (with #57, #36).
27. #57 enhancement(frontend): conectar Exportar Dados Analiticos nos resultados.
    - Milestone: Sprint 5 - BI e Fechamento. Status: merged/done.
    - Impact: medium-high; urgency: before BI/demo.
    - Rationale: results export button is visual only and should use real CSV data.
    - Status note: implemented in PR #79 and merged on 2026-06-11; GitHub issue is closed and project item is Done.
    - Verification: Explore export button downloads real CSV using current URL filters, handles failures, documents semantic-query export behavior, and frontend tests/build passed.
    - Batch: export/BI CSV PR (with #52, #36).
28. #36 Completar exportacao CSV dimensional para Power BI.
    - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09. Status: merged/done.
    - Impact: high; urgency: before #34.
    - Rationale: Power BI dashboard depends on stable dimensional CSVs.
    - Status note: implemented in PR #79 and merged on 2026-06-11; GitHub issue is closed and project item is Done.
    - Verification: `GET /api/v1/exportacoes/producoes.csv` accepts production filters, includes production/year/quadrienio-pesquisador-institution-area-Qualis dimensions plus `fato_quantidade_producoes`, backend pytest passed, and Docker smoke returned 51 filtered 2024 rows with dimensional fields.
    - Batch: export/BI CSV PR (with #52, #57).
29. #34 Criar dashboard Power BI com KPIs e segmentacoes.
    - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09. Status: in_progress.
    - Impact: high; urgency: after #36.
    - Rationale: final BI deliverable depends on exported dimensional data.
    - Status note: selected for the next indicators/BI batch on 2026-06-11 with #58 and #53; assigned to `brugabi` and moved to In Progress in the GitHub Project.
    - Verification: KPIs, slicers, and relationships work using the exported CSV data.
30. #58 enhancement(indicators): substituir KPIs e graficos mockados por dados reais.
    - Milestone: Sprint 5 - BI e Fechamento. Status: in_progress.
    - Impact: medium-high; urgency: before final demo if web indicators are shown.
    - Rationale: web indicators currently show fixed/mock values.
    - Status note: selected for the next indicators/BI batch on 2026-06-11 with #34 and #53; assigned to `brugabi` and moved to In Progress in the GitHub Project.
    - Verification: KPIs and charts use backend data or explicit no-data states.
31. #53 enhancement(frontend): melhorar UI do mapa de colaboracoes internacionais.
    - Milestone: Sprint 5 - BI e Fechamento. Status: in_progress.
    - Impact: medium; urgency: after #58 or if indicators are part of demo.
    - Rationale: map currently looks like static/demo data and should clarify real data availability.
    - Status note: selected for the next indicators/BI batch on 2026-06-11 with #34 and #58; assigned to `brugabi` and moved to In Progress in the GitHub Project.
    - Verification: map section has clear no-data/demo state, legend, and robust visuals without pretending backend integration exists.
32. #72 enhancement(infra): avaliar deploy gerenciado com Supabase/Vercel.
    - Milestone: Sprint 5 - BI e Fechamento. Status: pending/open.
    - Impact: medium-high; urgency: near end after core features/export/BI stabilize.
    - Rationale: #43 establishes a self-hosted Docker Compose baseline, but a public managed deployment may be better for final availability and operations.
    - Verification: Supabase/Vercel or equivalent options are evaluated with tradeoffs, the chosen path covers frontend/backend/database/secrets/data load, and public smoke validation is documented or a fallback justification keeps self-hosted deploy as the delivery path.
33. #37 Consolidar checklist de entrega final.
    - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09. Status: pending/open.
    - Impact: high; urgency: near end.
    - Rationale: final delivery needs implementation, documentation, deployment, and demo artifacts accounted for.
    - Verification: implementation, documentation, deployment, and demo artifacts are accounted for.
34. #32 Gravar e publicar video de demonstracao da solucao.
    - Milestone: Sprint 5 - BI e Fechamento. Original due date: 2026-06-09. Status: pending/open.
    - Impact: high; urgency: last delivery step.
    - Rationale: video should reflect the actual final state after fixes, deploy, BI, and checklist.
    - Verification: recorded flow demonstrates search, filters, details, BI outputs, and deployment state.

## Build, Test, and Development Commands

- `docker compose up -d`: start database, API, and frontend locally. The frontend container serves the production Angular build through Nginx at `http://localhost:4200/` by default.
- `docker compose up -d --build frontend`: rebuild and restart the frontend container after frontend changes when using Docker Compose.
- The frontend Nginx config must keep `index.html`, SPA routes, and proxied `/api/` responses non-cacheable; otherwise browser cache can make new Docker frontend builds appear only after a hard refresh. Keep long immutable cache only for hashed static assets.
- `docker compose up -d --build backend`: rebuild and restart the FastAPI backend after code changes when using Docker Compose. The backend service copies source files into the image and does not mount the local `backend/` directory as a live volume, so Swagger/OpenAPI at `http://localhost:8000/docs` keeps showing the old contract until the backend image/container is rebuilt.
- If `/explorar` looks empty, check the API/proxy before assuming the database lost data: `curl http://localhost:8000/api/v1/producoes/?pagina=1\&tamanho_pagina=1`, `curl http://localhost:4200/api/v1/producoes/?pagina=1\&tamanho_pagina=1`, and `docker compose logs --tail=120 backend`. With Uvicorn reload, `docker compose ps` can show the backend container as `Up` even after the child server process died during startup.
- `docker compose --env-file .env.production -f docker-compose.prod.yml config`: validate the self-hosted production Compose configuration before deploy. Production deploy details live in `docs/deploy.md`.
- `docker compose --profile etl up hop`: run the Apache Hop ETL job.
- On an already-populated local volume, the full Hop workflow can fail in `pipeline_qualis` with duplicate `qualis_periodicos` keys before reaching production pipelines. For production-type smoke checks without discarding data, run the target pipeline directly with `docker compose --profile etl run --rm -e HOP_FILE_PATH=/project/metadata/pipelines/<pipeline>.hpl hop` and then verify `select tipo_producao, count(*) from producoes group by tipo_producao`.
- If frontend filters and production search are empty, first verify database counts; an empty `producoes` or `instituicoes` table means the Hop ETL did not populate the database. The Hop container fails on Windows CRLF shell scripts, so keep `database/apache_hop/docker/*.sh` as LF; `.gitattributes` enforces this for `*.sh`.
- Semantic search requires rows in `vetores`. If `vetores` is empty, the backend returns semantic search as unavailable and the frontend should fall back to textual `/producoes` search until embeddings are generated. Use `docker compose --profile etl run --rm embeddings`; the script imports `database/seed/vetores_seed.csv` first and only calls OpenAI for missing vectors, then rewrites the seed for future machines.
- Production ETL now loads articles, event papers, books, and book chapters through separate Hop pipelines. Embeddings process `ARTIGO PUBLICADO`, `TRABALHO EM EVENTOS`, `LIVRO PUBLICADO`, and `CAPITULO DE LIVRO` by default; override with `EMBEDDING_PRODUCTION_TYPES` as a comma-separated list when a narrower seed is needed.
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

Backend tests use `pytest` under `backend/tests/`. When changing backend behavior, add or update focused tests for endpoint behavior, filters, error handling, and database edge cases.

When integrating frontend search with backend semantic search, verify the browser flow with a real query such as `dengue`. The semantic endpoint depends on `OPENAI_API_KEY`; if the key is invalid or unavailable, the frontend must still degrade gracefully to a real backend textual search (`/api/v1/producoes/?termo=...`) instead of showing a generic failure state.

## Branch protection rule

Never commit directly to `main`. Every change — including docs, AGENTS.md updates, and configuration — must be made on a dedicated feature branch and reach `main` only via a pull request. Create the branch before making any local commit. If an accidental commit lands on `main`, move it to a branch immediately via `git checkout -b <branch>` (the commit moves with the branch checkout, so `main` can be reset with `git reset --hard HEAD~1`).

## Commit, PR, and Wiki Workflow

Git history uses a mix of concise imperative commits and Conventional Commit prefixes, such as `feat(frontend): ...`, `build(docker): ...`, and `docs(frontend): ...`. Prefer that format for scoped changes.

Pull requests should include a short summary, affected areas (`backend`, `frontend`, `database`, `etl`), commands run, and any relevant screenshots for UI changes. Link related issues when available and mention required `.env` or Docker changes.

Prefer grouped PRs for related issue batches instead of opening one PR per issue. Before creating a PR, check the completed local scope and decide whether more adjacent queue items should be included while the branch context is active. A grouped PR should stay reviewable: one coherent theme, focused files, clear test evidence, and explicit `Closes #...` or `Refs #...` entries for each covered issue. Use a single-issue PR only when the change is isolated, urgent, security/deploy-sensitive, or mixing it with nearby work would obscure risk.

After using the `$gh-create-pr` skill to open a PR in the code repository, check whether related documentation changes exist in `../LattesHub.wiki/`. If they do, commit and push them directly to the wiki's main branch (`master` in the current checkout), because GitHub wikis are separate repositories and do not go through the code PR. If the wiki remote rejects the push, run `git pull --rebase origin master`, resolve conflicts by preserving remote updates plus the local documentation change, then push again.

## Security and Configuration

Keep secrets in `.env`; do not commit real `OPENAI_API_KEY` or production database passwords. Inside Docker, services should connect to PostgreSQL with `DB_HOST=db` and `DB_PORT=5432`; host-only access uses `DB_PORT_EXTERNAL`.
