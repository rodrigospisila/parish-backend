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
- **Jobs agendados**: [`@nestjs/schedule`](https://docs.nestjs.com/techniques/task-scheduling) (crons de lembrete de escala)
- **Mensageria**: SMS via [Twilio](https://www.twilio.com/) (OTP e fallback de notificações); push via Expo
- **Autenticação**: JWT (JSON Web Tokens) + RBAC hierárquico
- **PDF**: `pdfkit` (exportação de escalas)
- **Documentação da API**: Swagger (OpenAPI)

> **Planejado (ainda não integrado):** Redis + BullMQ para filas assíncronas e cache. O
> agendamento atual usa `@nestjs/schedule` (cron in-process); a migração para filas está prevista
> em fases futuras do [roadmap](../docs/roadmap-implementacao-fases.md).

## 📁 Estrutura do Projeto

```
src/
├── modules/            # Módulos da aplicação
│   ├── auth/          # Autenticação e autorização (JWT, RBAC)
│   ├── users/         # Gestão de usuários
│   ├── dioceses/      # Gestão de dioceses
│   ├── parishes/      # Gestão de paróquias
│   ├── communities/   # Gestão de comunidades
│   ├── members/       # Cadastro de fiéis (com LGPD)
│   ├── liturgy/       # Liturgia diária (integração CNBB)
│   ├── mass-schedules/ # Horários de missa
│   └── news/          # Avisos paroquiais e notícias
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

## ✅ Módulos Implementados (Fase 1)

### Autenticação e Autorização
- ✅ Login com email/senha
- ✅ Registro de usuários
- ✅ Refresh token
- ✅ Logout
- ✅ RBAC com 6 perfis de acesso:
  - DIOCESAN_ADMIN
  - PARISH_ADMIN
  - COMMUNITY_COORDINATOR
  - PASTORAL_COORDINATOR
  - VOLUNTEER
  - FAITHFUL

### Estrutura Eclesial
- ✅ CRUD de Dioceses
- ✅ CRUD de Paróquias
- ✅ CRUD de Comunidades

### Membros e Fiéis
- ✅ CRUD completo de membros
- ✅ Conformidade LGPD:
  - Termo de consentimento
  - Exportação de dados
  - Direito ao esquecimento (anonimização)
- ✅ Busca por nome
- ✅ Histórico sacramental
- ✅ Vínculo com pastorais

### Liturgia Diária
- ✅ Integração com API da CNBB
- ✅ Cache de 24 horas
- ✅ Fallback local
- ✅ Endpoint para liturgia do dia
- ✅ Endpoint para liturgia por data

### Horários de Missa
- ✅ CRUD de horários regulares
- ✅ Horários especiais (festas, solenidades)
- ✅ Filtro por dia da semana
- ✅ Filtro por tipo (Missa, Confissão, Adoração, Terço)

### Avisos Paroquiais e Notícias
- ✅ CRUD completo
- ✅ Categorização
- ✅ Avisos urgentes
- ✅ Filtros por categoria e comunidade
- ✅ Listagem de notícias recentes

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
- **FinancialTransaction**: modelo-base de transações financeiras. **Sem módulo/endpoints ainda** —
  serve de fundação para o módulo Financeiro/Dízimo previsto na Fase 4 do
  [roadmap](../docs/roadmap-implementacao-fases.md). Não deve ser usado como se estivesse ativo.
- **Notification**: Notificações push (Expo), com fallback SMS e opt-out (LGPD)
- **AuditLog**: trilha de auditoria (quem acessou/alterou dados sensíveis)
- **Consent**: consentimentos granulares LGPD (tratamento, imagem, comunicações)
- **PasswordResetToken**: recuperação de senha por autoatendimento

## 🔐 Perfis de Acesso (RBAC)

O sistema implementa controle de acesso baseado em funções:

1. **DIOCESAN_ADMIN**: Acesso total à diocese e paróquias subordinadas
2. **PARISH_ADMIN**: Acesso total à paróquia e comunidades subordinadas
3. **COMMUNITY_COORDINATOR**: Gestão de uma comunidade específica
4. **PASTORAL_COORDINATOR**: Gestão de pastoral/ministério específico
5. **VOLUNTEER**: Acesso às escalas e eventos em que está envolvido
6. **FAITHFUL**: Somente leitura de eventos e notícias públicas

## 📖 Documentação da API

Após iniciar a aplicação, a documentação interativa da API (Swagger) estará disponível em:

```
http://localhost:3000/api
```

### Principais Endpoints

#### Autenticação
- `POST /api/v1/auth/register` - Registro de usuário
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/logout` - Logout

#### Dioceses, Paróquias e Comunidades
- `GET /api/v1/dioceses` - Listar dioceses
- `GET /api/v1/parishes` - Listar paróquias
- `GET /api/v1/communities` - Listar comunidades

#### Membros
- `GET /api/v1/members` - Listar membros
- `POST /api/v1/members` - Criar membro
- `GET /api/v1/members/:id/export` - Exportar dados (LGPD)
- `POST /api/v1/members/:id/anonymize` - Anonimizar (LGPD)

#### Liturgia
- `GET /api/v1/liturgy/today` - Liturgia do dia
- `GET /api/v1/liturgy/:date` - Liturgia por data (YYYY-MM-DD)

#### Horários de Missa
- `GET /api/v1/mass-schedules` - Listar horários
- `GET /api/v1/mass-schedules/day/:dayOfWeek` - Horários por dia da semana
- `GET /api/v1/mass-schedules/special` - Horários especiais

#### Notícias
- `GET /api/v1/news` - Listar notícias
- `GET /api/v1/news/recent` - Notícias recentes
- `GET /api/v1/news/urgent` - Avisos urgentes

## 🧪 Testes

- **Testes Unitários**: `pnpm run test`
- **Testes de Integração**: `pnpm run test:e2e`
- **Cobertura de Testes**: `pnpm run test:cov`

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

## 📦 Módulos já implementados além da Fase 1

Eventos/Calendário, Escalas de Serviço, Pedidos de Oração, Intenções de Missa, Pastorais/Ministérios
e Notificações Push já existem no código. Consulte o
[roadmap de implementação por fases](../docs/roadmap-implementacao-fases.md) para o estado real de
cada área (o que está completo, parcial ou pendente) e as próximas entregas.

## 🤝 Contribuição

Consulte o arquivo `CONTRIBUTING.md` para mais detalhes sobre como contribuir com o projeto.

## 📄 Licença

Este projeto está sob a licença MIT.

---

**Desenvolvido com ❤️ para a comunidade católica**

