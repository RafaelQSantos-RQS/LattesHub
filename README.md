# LattesHub

# Sistema de Busca de Pesquisadores com Full-Text Search e IA

Sistema acadêmico para extração, indexação e busca inteligente de produções científicas a partir do Currículo Lattes (XML), utilizando Full-Text Search, embeddings vetoriais e LLMs.

## Documentação completa com detalhes: https://github.com/RafaelQSantos-RQS/LattesHub/wiki

---

O projeto realiza:

* Extração de dados XML do Currículo Lattes;
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
FastAPI + Langchain
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
| IA / Embeddings  | Langchain + OpenAI      |
| Front-end        | Angular + TailwindCSS   |
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

Para construir as imagens e rodar o pipeline completo de ponta a ponta (Banco > API > ETL > Embeddings), execute o comando na raiz do projeto:

```bash
docker compose --profile etl up --build

```

**O que este comando faz de forma orquestrada:**

1. Inicia o **PostgreSQL** (com a extensão pgvector).
2. Inicia o **Backend** (FastAPI) na porta 8000.
3. Executa o serviço **Apache Hop** (`latteshub-etl`), que extrai as informações dos XMLs e as popula no banco de dados.
4. Ao finalizar o ETL com sucesso, executa o serviço de **Embeddings** (`latteshub-embeddings`), que identifica as novas produções inseridas, gera os vetores semânticos chamando a API da OpenAI e os salva no banco, encerrando-se automaticamente ao finalizar a carga.

### Passo 2: Desenvolvimento no dia a dia

Após a carga inicial de dados ter sido concluída (Passo 1), você não precisa rodar o pipeline de ETL e gastar requisições da OpenAI a cada vez que for programar.

Para subir apenas os serviços persistentes (Banco de Dados e API backend) no dia a dia, utilize:

```bash
docker compose up

```

---

Projeto desenvolvido para fins acadêmicos e experimentação em IA aplicada à recuperação de informação científica.