# Relatório do Processo Scrum — LattesHub

> Documento de apresentação do processo Scrum do projeto LattesHub.
> Dados extraídos do GitHub (Issues, Pull Requests, Milestones e Projects) em **15/06/2026**.
> Repositório: `RafaelQSantos-RQS/LattesHub` · Board: GitHub Projects #6.

## 1. Visão geral do produto

O LattesHub é uma plataforma de busca e análise da produção científica extraída de currículos
Lattes (XML) e do Qualis CAPES. O pipeline de dados vai de **Apache Hop (ETL) → PostgreSQL + pgvector
→ FastAPI → Angular**, com busca textual, busca semântica (RAG/embeddings), APIs REST, painel
analítico e exportação dimensional para BI.

## 2. Framework e cadência

- **Framework:** Scrum, com Sprints semanais.
- **Gestão:** GitHub Issues (itens de backlog) + Milestones (Sprints) + GitHub Projects #6 (board Kanban: To Do / In Progress / Done).
- **Rastreabilidade:** cada entrega é uma Issue vinculada a um Pull Request, com `Closes #...`/`Refs #...`.
- **Branching:** trabalho em feature branches; `main` protegida; merge somente via Pull Request.

## 3. Time

| Pessoa | Issues/commits | Pull Requests (merge) |
|---|---|---|
| Brunna Gabriella (`brugabi`) | maior volume de commits | 24 |
| Jeoston Araújo (`jeoaraujx`) | contribuições de ETL/back/front | 5 |
| Rafael Queiroz (`RafaelQSantos-RQS`) | infraestrutura/integração | 4 |

> 3 integrantes ativos. **33 Pull Requests** mergeados no total.

## 4. Artefatos Scrum

- **Product Backlog:** mantido no GitHub Projects #6 (72 itens no board) e como Issues priorizadas.
- **Sprint Backlog:** Issues atribuídas a cada Milestone (Sprint), movidas no board por status.
- **Incremento:** a cada Sprint, software integrado e testado (backend com `pytest`, frontend com testes de unidade + build em CI).
- **Definition of Done:** código revisado em PR, testes passando, documentação/README atualizados quando há mudança de comportamento.

## 5. Histórico de Sprints (Milestones)

| Sprint | Foco | Prazo | Itens concluídos |
|---|---|---|---|
| **Sprint 1** | Concepção: visão, casos de uso, ER, protótipo, setup de repositório e board | 13/05/2026 | 10 |
| **Sprint 2** | ETL Apache Hop, FTS (tsvector), qualidade de dados, dimensão Qualis | 20/05/2026 | 4 |
| **Sprint 3** | Embeddings + busca semântica (RAG), API FastAPI, API REST core, testes | 27/05/2026 | 11 |
| **Sprint 4** | Frontend Angular: integração front-back, filtros reais, detalhes do pesquisador | 02/06/2026 | 8 |
| **Sprint 5** | BI, painel analítico, correções de qualidade, segurança, deploy e fechamento | 09/06/2026* | 43 (de 46) |

> *Total: **79 itens** entregues ao longo das 5 Sprints. O prazo da entrega da Sprint V (Painel Analítico) é **17/06/2026**.

## 6. Sprint 5 em detalhe (BI e Fechamento)

A Sprint 5 concentrou o maior volume de trabalho (46 itens), distribuídos por tipo:

| Categoria | Itens |
|---|---|
| `bug` (correções de qualidade/UX/API) | 15 |
| `enhancement` (melhorias de busca, filtros, indicadores) | 12 |
| `documentation` (checklist, vídeo) | 2 |
| `infrastructure` (deploy/CORS/pool) | 2 |
| `Database` | 1 |

**Status atual:** 43 concluídas, **3 abertas**:

- **#55** — `enhancement(search)`: busca por área e instituição (branch remota já iniciada).
- **#37** — `documentation`: consolidar checklist de entrega final.
- **#32** — `documentation`: gravar e publicar vídeo de demonstração.

### Destaques técnicos da Sprint 5
- Segurança/confiabilidade da API: CORS restrito em produção (#60), higiene do pool (#61), erros 500 sanitizados (#62).
- Busca: textual com unaccent/múltiplos campos (#66), ordenação de respostas assíncronas (#65), embeddings ampliados (#63).
- ETL: importação de eventos, livros e capítulos além de artigos (#67).
- BI/Painel: exportação CSV dimensional (#36), indicadores com dados reais (#58), dashboard analítico (#34).
- Deploy: baseline self-hosted com Docker Compose de produção (#43).

## 7. Entrega da Sprint V — Painel Analítico

| Requisito da Sprint V | Status |
|---|---|
| Back-end gera dados analíticos em CSV | ✅ `GET /api/v1/exportacoes/producoes.csv` (com filtros e colunas dimensionais) |
| Banco de Dados Analítico (modelo estrela) | ✅ Views `dim_quadrienio_ano`, `dim_pesquisador`, `fato_producao` no PostgreSQL |
| Dimensão **Quadrienal-Ano** | ✅ Derivada dinamicamente (janelas CAPES), exposta no painel e no CSV |
| Dimensão **Pesquisador** | ✅ Bloco "Top Pesquisadores" no painel + filtro cruzado |
| Fato — produção científica | ✅ `fato_producao` / `fato_quantidade_producoes` |
| Painel com gráficos e tabelas | ✅ Página `/indicadores` (KPIs, produções por ano/quadriênio, top áreas/pesquisadores/instituições, distribuição Qualis) |
| Apresentação do processo Scrum | ✅ Este documento |

## 8. Métricas-resumo

- **Sprints concluídas:** 4 + 1 em fechamento.
- **Itens de backlog entregues:** 79.
- **Pull Requests mergeados:** 33.
- **Integrantes ativos:** 3.
- **Itens no board (Projects #6):** 72.
- **Pendências para fechar a Sprint 5:** 3 issues (#55, #37, #32).
