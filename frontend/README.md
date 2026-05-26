# LattesHub - Frontend

Este é o frontend do **LattesHub**, o Portal de Dados Abertos. O projeto foi desenvolvido utilizando as tecnologias mais modernas do ecossistema web para garantir performance, acessibilidade e uma ótima experiência de usuário.

## 🚀 Tecnologias Utilizadas

* **[Angular 21](https://angular.dev/)**: Framework principal, utilizando Standalone Components e Signals para reatividade.
* **[Tailwind CSS v4](https://tailwindcss.com/)**: Estilização utilitária e design system customizado.
* **[TypeScript](https://www.typescriptlang.org/)**: Tipagem estática para maior segurança no código.
* **[Docker](https://www.docker.com/) & [Nginx](https://nginx.org/)**: Containerização otimizada para produção (multi-stage build com usuário *unprivileged*).

## 📋 Pré-requisitos

Para rodar o projeto localmente, você precisará de:
* **Node.js** (versão recomendada: `v24.15.0` ou superior)
* **npm** (gerenciador de pacotes)
* **Docker** (opcional, para rodar via container)

## 💻 Desenvolvimento Local

1. Clone o repositório e acesse a pasta do frontend:
   ```bash
   cd frontend
   ```

2. Instale as dependências do projeto:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm start
   ```
   O aplicativo estará disponível em `http://localhost:4200/`. A página será recarregada automaticamente caso você faça alterações no código.

## 🐳 Executando com Docker (Produção)

O projeto possui um `Dockerfile` otimizado para produção, utilizando um build em múltiplos estágios e servindo os arquivos estáticos através de um servidor Nginx seguro (rodando sem privilégios de root).

1. Construa a imagem Docker:
   ```bash
   docker build -t lattes-hub-frontend .
   ```

2. Execute o container:
   ```bash
   docker run -p 8080:8080 lattes-hub-frontend
   ```
   O aplicativo estará disponível em `http://localhost:8080/`.

## 🏗️ Estrutura do Projeto

* `src/app/`: Contém os componentes da aplicação (Home, Results, Indicators, About, Layouts).
* `src/styles.scss`: Arquivo de estilos globais e configuração do Tailwind CSS v4.
* `Dockerfile`: Configuração de containerização para produção.
* `nginx.conf`: Configuração do servidor web Nginx para roteamento SPA e cache.

## 🛠️ Comandos Úteis

* `npm start`: Inicia o servidor de desenvolvimento.
* `npm run build`: Compila o projeto para produção na pasta `dist/`.
* `npm test`: Executa os testes unitários via Vitest/Karma (dependendo da configuração).
