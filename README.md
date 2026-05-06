# LattesHub

# Sistema de Busca de Pesquisadores com Full-Text Search e IA

Sistema acadêmico para extração, indexação e busca inteligente de produções científicas a partir do Currículo Lattes (XML), utilizando Full-Text Search, embeddings vetoriais e LLMs.

---

O projeto realiza:

* Extração de dados XML do Currículo Lattes;
* Processo ETL com Apache Hop;
* Armazenamento relacional no PostgreSQL;
* Busca textual com PostgreSQL Full-Text Search;
* Busca semântica com pgvector + embeddings;
* API REST com FastAPI;
* Interface web em Next.js;
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
FastAPI + Langchain
    ↓
Next.js Front-end
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
| IA / Embeddings  | Langchain + OpenAI      |
| Front-end        | Next.js + TailwindCSS   |
| ETL              | Apache Hop              |
| BI               | Power BI                |

---

# Funcionalidades

* Busca textual por títulos científicos;
* Busca semântica utilizando IA;
* Indexação vetorial de produções;
* API REST desacoplada;
* Dashboard analítico via Power BI;
* Pipeline ETL automatizado;
* Exportação CSV multidimensional.

---

Projeto desenvolvido para fins acadêmicos e experimentação em IA aplicada à recuperação de informação científica.
