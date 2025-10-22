# Parish Backend

Backend API do sistema Parish - Plataforma de gestão para dioceses, paróquias e comunidades católicas.

## 1. Visão Geral

Este repositório contém o código-fonte da API backend do sistema Parish. A API é responsável por toda a lógica de negócio, gestão de dados, autenticação e comunicação com o aplicativo mobile e a interface web.

## 2. Arquitetura e Tecnologias

- **Framework**: [NestJS](https://nestjs.com/) (v11.x)
- **Linguagem**: TypeScript
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (v16.x ou 17.x)
- **ORM**: [Prisma](https://www.prisma.io/) (v6.x)
- **Runtime**: [Node.js](https://nodejs.org/) (v20.x ou 22.x)
- **Cache**: [Redis](https://redis.io/) (v7.x)
- **Filas**: [BullMQ](https://bullmq.io/)
- **Autenticação**: JWT (JSON Web Tokens)
- **Documentação da API**: Swagger (OpenAPI)

## 3. Estrutura do Projeto

A estrutura do projeto segue as convenções do NestJS, com uma organização modular para facilitar a manutenção e escalabilidade.

```
src/
├── modules/            # Módulos da aplicação (auth, users, events, etc.)
├── common/             # Componentes reutilizáveis (guards, interceptors, etc.)
├── config/             # Configurações da aplicação
├── database/           # Migrations e seeds do Prisma
└── main.ts             # Ponto de entrada da aplicação
```

## 4. Como Começar

### Pré-requisitos

- Node.js (v20.x ou 22.x)
- Docker e Docker Compose
- Git

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/rodrigospisila/parish-backend.git
   cd parish-backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   - Copie o arquivo `.env.example` para `.env`.
   - Preencha as variáveis de ambiente necessárias (banco de dados, chaves de API, etc.).

4. **Inicie o ambiente de desenvolvimento com Docker:**
   ```bash
   docker-compose up -d
   ```

5. **Aplique as migrations do banco de dados:**
   ```bash
   npx prisma migrate dev
   ```

6. **Inicie a aplicação em modo de desenvolvimento:**
   ```bash
   npm run start:dev
   ```

## 5. Testes

- **Testes Unitários**: `npm run test`
- **Testes de Integração**: `npm run test:e2e`
- **Cobertura de Testes**: `npm run test:cov`

## 6. Documentação da API

Após iniciar a aplicação, a documentação da API (Swagger) estará disponível em `http://localhost:3000/api`.

## 7. Contribuição

Consulte o arquivo `CONTRIBUTING.md` para mais detalhes sobre como contribuir com o projeto.

