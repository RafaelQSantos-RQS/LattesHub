# LattesHub - Frontend

Frontend Angular do LattesHub, o Portal de Dados Abertos.

## Tecnologias Utilizadas

* **Angular 21**: framework principal, utilizando Standalone Components e Signals.
* **Tailwind CSS v4**: estilos utilitarios e design system customizado.
* **TypeScript**: tipagem estatica para maior seguranca no codigo.
* **Docker e Nginx**: build multi-stage e servidor estatico sem privilegios de root.

## Pre-requisitos

Para rodar o projeto localmente, voce precisara de:

* **Node.js**: versao recomendada `v24.15.0` ou superior.
* **npm**.
* **Docker**: opcional, para rodar via container.

## Desenvolvimento Local

1. Acesse a pasta do frontend:

   ```bash
   cd frontend
   ```

2. Instale as dependencias:

   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:

   ```bash
   npm start
   ```

   O aplicativo fica disponivel em `http://localhost:4200/`.

O frontend consome a API pelo caminho relativo `/api/v1`. No desenvolvimento local, `npm start` usa `proxy.conf.js` para encaminhar `/api/` para `http://localhost:8000`. Se o backend estiver em outra URL, defina:

```bash
LATTESHUB_API_PROXY_TARGET=http://localhost:9000 npm start
```

## Executando com Docker

Na raiz do repositorio, o `docker-compose.yml` publica este frontend em `http://localhost:4200/` e o Nginx encaminha `/api/` para o servico interno `backend:8000`:

```bash
docker compose up -d frontend
```

Para construir e rodar apenas a imagem do frontend:

```bash
docker build -t lattes-hub-frontend .
docker run -p 8080:8080 lattes-hub-frontend
```

O aplicativo fica disponivel em `http://localhost:8080/`.

## Estrutura do Projeto

* `src/app/`: componentes da aplicacao.
* `src/styles.scss`: estilos globais e configuracao do Tailwind CSS v4.
* `Dockerfile`: configuracao de containerizacao.
* `nginx.conf`: servidor web, roteamento SPA, cache e proxy `/api/`.
* `proxy.conf.js`: proxy do Angular dev server para a API local.

## Comandos Uteis

* `npm start`: inicia o servidor de desenvolvimento com proxy de API.
* `npm run build`: compila o projeto para producao na pasta `dist/`.
* `npm test`: executa os testes unitarios.
