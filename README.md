# Parish Backend

Backend API do sistema Parish - Plataforma de gestão para dioceses, paróquias e comunidades católicas.

## 📋 Visão Geral

Este repositório contém o código-fonte da API backend do sistema Parish. A API é responsável por toda a lógica de negócio, gestão de dados, autenticação e comunicação com o aplicativo mobile e a interface web.

## 🚀 Tecnologias

- **Framework**: [NestJS](https://nestjs.com/) (v11.x)
- **Linguagem**: TypeScript
- **Banco de Dados**: [PostgreSQL](https://www.postgresql.org/) (v16.x ou 17.x)
- **ORM**: [Prisma](https://www.prisma.io/) (v6.x)
- **Runtime**: [Node.js](https://nodejs.org/) (v20.x ou 22.x)
- **Cache**: [Redis](https://redis.io/) (v7.x)
- **Filas**: [BullMQ](https://bullmq.io/)
- **Autenticação**: JWT (JSON Web Tokens)
- **Documentação da API**: Swagger (OpenAPI)

## 📁 Estrutura do Projeto

```
src/
├── modules/            # Módulos da aplicação
│   ├── auth/          # Autenticação e autorização
│   ├── users/         # Gestão de usuários
│   ├── dioceses/      # Gestão de dioceses
│   ├── parishes/      # Gestão de paróquias
│   ├── communities/   # Gestão de comunidades
│   ├── members/       # Cadastro de fiéis
│   ├── events/        # Calendário e eventos
│   ├── schedules/     # Escalas de serviço
│   ├── liturgy/       # Liturgia diária
│   ├── mass-intentions/ # Intenções de missa
│   ├── prayer-requests/ # Pedidos de oração
│   ├── finance/       # Gestão financeira
│   └── notifications/ # Notificações
├── common/            # Componentes reutilizáveis
│   ├── decorators/
│   ├── guards/
│   ├── interceptors/
│   ├── filters/
│   └── pipes/
├── config/            # Configurações
├── database/          # Prisma (migrations e seeds)
└── main.ts            # Ponto de entrada
```

## 🛠️ Como Começar

### Pré-requisitos

- Node.js (v20.x ou 22.x)
- Docker e Docker Compose (para PostgreSQL, Redis e MailHog)
- Git
- pnpm (gerenciador de pacotes)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/rodrigospisila/parish-backend.git
   cd parish-backend
   ```

2. **Instale as dependências:**
   ```bash
   pnpm install
   ```

3. **Configure as variáveis de ambiente:**
   - Copie o arquivo `.env.example` para `.env`
   - Ajuste as variáveis conforme necessário

4. **Inicie o ambiente de desenvolvimento com Docker:**
   ```bash
   docker compose up -d
   ```

   Isso iniciará:
   - PostgreSQL na porta `5432`
   - Redis na porta `6379`
   - MailHog na porta `8025` (interface web) e `1025` (SMTP)

5. **Gere o Prisma Client:**
   ```bash
   npx prisma generate
   ```

6. **Execute as migrations do banco de dados:**
   ```bash
   npx prisma migrate dev --name init
   ```

7. **Inicie a aplicação em modo de desenvolvimento:**
   ```bash
   pnpm run start:dev
   ```

A API estará disponível em `http://localhost:3000`.

## 📊 Schema do Banco de Dados

O schema do Prisma inclui as seguintes entidades principais:

### Estrutura Eclesial
- **Diocese**: Dioceses católicas
- **Parish**: Paróquias vinculadas a dioceses
- **Community**: Comunidades (matriz/capelas) vinculadas a paróquias
- **Pastoral**: Pastorais, ministérios e movimentos

### Usuários e Membros
- **User**: Usuários do sistema com diferentes perfis (RBAC)
- **Member**: Fiéis e membros cadastrados
- **Sacrament**: Histórico sacramental dos membros

### Eventos e Escalas
- **Event**: Eventos litúrgicos e pastorais
- **Schedule**: Escalas de serviço
- **ScheduleAssignment**: Atribuições de voluntários em escalas
- **MassSchedule**: Horários regulares de missa

### Conteúdo Espiritual
- **MassIntention**: Intenções de missa
- **PrayerRequest**: Pedidos de oração
- **News**: Avisos e notícias paroquiais

### Financeiro e Notificações
- **FinancialTransaction**: Transações financeiras
- **Notification**: Notificações push

## 🔐 Perfis de Acesso (RBAC)

O sistema implementa controle de acesso baseado em funções:

1. **DIOCESAN_ADMIN**: Acesso total à diocese e paróquias subordinadas
2. **PARISH_ADMIN**: Acesso total à paróquia e comunidades subordinadas
3. **COMMUNITY_COORDINATOR**: Gestão de uma comunidade específica
4. **PASTORAL_COORDINATOR**: Gestão de pastoral/ministério específico
5. **VOLUNTEER**: Acesso às escalas e eventos em que está envolvido
6. **FAITHFUL**: Somente leitura de eventos e notícias públicas

## 🧪 Testes

- **Testes Unitários**: `pnpm run test`
- **Testes de Integração**: `pnpm run test:e2e`
- **Cobertura de Testes**: `pnpm run test:cov`

## 📖 Documentação da API

Após iniciar a aplicação, a documentação interativa da API (Swagger) estará disponível em:

```
http://localhost:3000/api
```

## 🗄️ Prisma Studio

Para visualizar e editar os dados do banco de dados com uma interface gráfica:

```bash
npx prisma studio
```

Acesse em `http://localhost:5555`.

## 🔄 Migrations

### Criar uma nova migration
```bash
npx prisma migrate dev --name nome_da_migration
```

### Aplicar migrations em produção
```bash
npx prisma migrate deploy
```

### Resetar o banco de dados (desenvolvimento)
```bash
npx prisma migrate reset
```

## 🌱 Seeds

Para popular o banco de dados com dados iniciais:

```bash
npx prisma db seed
```

## 📦 Build para Produção

```bash
pnpm run build
pnpm run start:prod
```

## 🐳 Docker

O projeto inclui um `docker-compose.yml` para facilitar o desenvolvimento local. Os serviços incluídos são:

- **PostgreSQL**: Banco de dados principal
- **Redis**: Cache e gerenciamento de filas
- **MailHog**: Servidor SMTP para testes de email

## 🤝 Contribuição

Consulte o arquivo `CONTRIBUTING.md` para mais detalhes sobre como contribuir com o projeto.

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido com ❤️ para a comunidade católica**

