# 🔧 Troubleshooting - Problemas Comuns

Este documento lista os problemas mais comuns e suas soluções.

---

## ❌ Erro: "The column `users.parishId` does not exist"

### **Problema:**
```
Invalid `prisma.user.findFirst()` invocation
The column `users.parishId` does not exist in the current database.
```

### **Causa:**
As migrations mais recentes não foram aplicadas no seu banco de dados local.

### **Solução 1: Usar o script de reset (RECOMENDADO)**

**Windows:**
```cmd
cd parish-backend
scripts\reset-database.bat
```

**Linux/Mac:**
```bash
cd parish-backend
./scripts/reset-database.sh
```

Este script irá:
1. Resetar o banco
2. Gerar Prisma Client atualizado
3. Aplicar TODAS as migrations
4. Criar o SYSTEM_ADMIN

### **Solução 2: Aplicar migrations manualmente**

Se você NÃO quer perder os dados:

```bash
cd parish-backend

# 1. Gerar Prisma Client atualizado
pnpm prisma generate

# 2. Aplicar migrations pendentes
pnpm prisma migrate deploy

# 3. Criar SYSTEM_ADMIN (se necessário)
pnpm prisma db seed
```

### **Solução 3: Reset completo manual**

Se as soluções acima não funcionarem:

```bash
cd parish-backend

# 1. Resetar banco (APAGA TODOS OS DADOS!)
pnpm prisma migrate reset --force --skip-seed

# 2. Gerar Prisma Client
pnpm prisma generate

# 3. Aplicar migrations
pnpm prisma migrate deploy

# 4. Criar SYSTEM_ADMIN
pnpm prisma db seed
```

---

## ❌ Erro: "Database does not exist"

### **Problema:**
```
Can't reach database server at `localhost:5432`
Database `parish_db` does not exist
```

### **Causa:**
O banco de dados não foi criado.

### **Solução:**

**Opção 1: Via linha de comando**
```bash
createdb parish_db
```

**Opção 2: Via psql**
```bash
psql -U postgres
CREATE DATABASE parish_db;
\q
```

**Opção 3: Via pgAdmin**
1. Abrir pgAdmin
2. Clicar com botão direito em "Databases"
3. Selecionar "Create" > "Database"
4. Nome: `parish_db`
5. Clicar em "Save"

Depois, execute o script de reset novamente.

---

## ❌ Erro: "Connection refused"

### **Problema:**
```
Can't reach database server at `localhost:5432`
Connection refused
```

### **Causa:**
PostgreSQL não está rodando.

### **Solução:**

**Windows:**
1. Abrir "Serviços" (services.msc)
2. Procurar "postgresql"
3. Clicar com botão direito > "Iniciar"

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Para iniciar automaticamente
```

**Mac:**
```bash
brew services start postgresql
```

---

## ❌ Erro: "Permission denied"

### **Problema (Linux/Mac):**
```
bash: ./scripts/reset-database.sh: Permission denied
```

### **Solução:**
```bash
chmod +x scripts/reset-database.sh
./scripts/reset-database.sh
```

---

## ❌ Erro: "SYSTEM_ADMIN já existe"

### **Problema:**
```
⚠️  SYSTEM_ADMIN já existe. Pulando criação...
```

### **Causa:**
Isso NÃO é um erro! O seed detecta que já existe um SYSTEM_ADMIN e pula a criação para evitar duplicatas.

### **Solução:**
Nenhuma ação necessária. Use as credenciais existentes:
```
Email: system@parish.app
Senha: System@Admin123
```

### **Se você esqueceu a senha:**

**Opção 1: Deletar e recriar**
```bash
# Via Prisma Studio
pnpm prisma studio
# Deletar o usuário SYSTEM_ADMIN manualmente

# Ou via SQL
psql -U postgres -d parish_db
DELETE FROM users WHERE role = 'SYSTEM_ADMIN';
\q

# Executar seed novamente
pnpm prisma db seed
```

**Opção 2: Resetar senha via SQL**
```sql
-- Gerar hash da nova senha (use bcrypt online ou Node.js)
-- Exemplo: hash de "NovaSenha@123"
UPDATE users 
SET password = '$2b$10$...' 
WHERE role = 'SYSTEM_ADMIN';
```

---

## ❌ Erro: "ts-node: command not found"

### **Problema:**
```
ts-node: command not found
```

### **Causa:**
Dependências não foram instaladas.

### **Solução:**
```bash
cd parish-backend
pnpm install
```

---

## ❌ Erro: "pnpm: command not found"

### **Problema:**
```
pnpm: command not found
```

### **Causa:**
pnpm não está instalado.

### **Solução:**

**Windows:**
```cmd
npm install -g pnpm
```

**Linux/Mac:**
```bash
npm install -g pnpm
# ou
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## ❌ Erro: "Invalid credentials"

### **Problema:**
Login falha com "Credenciais inválidas".

### **Causas Possíveis:**

1. **Senha incorreta**
   - Verifique: `System@Admin123` (case-sensitive!)
   - S maiúsculo, A maiúsculo, @ e números

2. **Email incorreto**
   - Verifique: `system@parish.app`
   - Tudo minúsculo

3. **SYSTEM_ADMIN não foi criado**
   ```bash
   pnpm prisma db seed
   ```

4. **Banco desatualizado**
   ```bash
   ./scripts/reset-database.sh
   ```

### **Verificar se usuário existe:**
```bash
pnpm prisma studio
# Abrir tabela "users"
# Procurar por role = SYSTEM_ADMIN
```

---

## ❌ Erro: "Migration failed"

### **Problema:**
```
Error: Migration failed to apply
```

### **Causa:**
Conflito entre o estado do banco e as migrations.

### **Solução 1: Reset completo (RECOMENDADO)**
```bash
./scripts/reset-database.sh
```

### **Solução 2: Resolver manualmente**
```bash
# Ver status das migrations
pnpm prisma migrate status

# Marcar migrations como aplicadas (se já foram aplicadas manualmente)
pnpm prisma migrate resolve --applied "nome_da_migration"

# Ou marcar como rolledback
pnpm prisma migrate resolve --rolled-back "nome_da_migration"
```

---

## ❌ Erro: "Port 5432 already in use"

### **Problema:**
```
Error: Port 5432 is already in use
```

### **Causa:**
Outra instância do PostgreSQL está rodando.

### **Solução:**

**Opção 1: Usar a instância existente**
Verifique o `.env` e use a instância que já está rodando.

**Opção 2: Parar a outra instância**
```bash
# Linux
sudo systemctl stop postgresql

# Mac
brew services stop postgresql

# Windows
# Parar via Gerenciador de Serviços
```

---

## ❌ Erro: "Out of memory"

### **Problema:**
```
JavaScript heap out of memory
```

### **Causa:**
Node.js ficou sem memória.

### **Solução:**
```bash
# Aumentar limite de memória
export NODE_OPTIONS="--max-old-space-size=4096"

# Windows (CMD)
set NODE_OPTIONS=--max-old-space-size=4096

# Windows (PowerShell)
$env:NODE_OPTIONS="--max-old-space-size=4096"

# Executar script novamente
./scripts/reset-database.sh
```

---

## ❌ Erro: "Cannot find module '@prisma/client'"

### **Problema:**
```
Error: Cannot find module '@prisma/client'
```

### **Causa:**
Prisma Client não foi gerado.

### **Solução:**
```bash
cd parish-backend
pnpm install
pnpm prisma generate
```

---

## ❌ Erro: ".env file not found"

### **Problema:**
```
[ERRO] Arquivo .env nao encontrado
```

### **Causa:**
Arquivo `.env` não existe.

### **Solução:**

**Opção 1: Copiar do exemplo**
```bash
cd parish-backend
cp .env.example .env
# Editar .env com suas configurações
```

**Opção 2: Criar manualmente**
```bash
cd parish-backend
nano .env  # ou notepad .env no Windows
```

Conteúdo mínimo:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/parish_db?schema=public"
JWT_SECRET="seu-secret-aqui-muito-seguro-e-aleatorio"
JWT_EXPIRES_IN="7d"
```

---

## 🔍 **Comandos de Diagnóstico**

### **Verificar status do PostgreSQL:**
```bash
# Linux
sudo systemctl status postgresql

# Mac
brew services list | grep postgresql

# Windows
# Verificar no Gerenciador de Serviços
```

### **Verificar conexão com banco:**
```bash
psql -U postgres -d parish_db -c "SELECT version();"
```

### **Verificar migrations:**
```bash
pnpm prisma migrate status
```

### **Verificar se SYSTEM_ADMIN existe:**
```bash
pnpm prisma studio
# Abrir tabela "users"
```

### **Ver logs do PostgreSQL:**
```bash
# Linux
sudo tail -f /var/log/postgresql/postgresql-*.log

# Mac
tail -f /usr/local/var/log/postgres.log

# Windows
# Ver em: C:\Program Files\PostgreSQL\{version}\data\log\
```

---

## 📞 **Ainda com Problemas?**

Se nenhuma das soluções acima funcionou:

1. **Verificar versões:**
```bash
node --version    # Deve ser >= 18
pnpm --version    # Deve ser >= 8
psql --version    # Deve ser >= 14
```

2. **Limpar cache:**
```bash
cd parish-backend
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

3. **Verificar logs:**
```bash
# Ver logs do backend
pnpm start:dev

# Ver logs do PostgreSQL
# (comandos acima na seção de diagnóstico)
```

4. **Reset completo do ambiente:**
```bash
# Deletar banco
dropdb parish_db

# Recriar banco
createdb parish_db

# Reinstalar dependências
cd parish-backend
rm -rf node_modules
pnpm install

# Executar script de reset
./scripts/reset-database.sh
```

---

## 📚 **Documentação Adicional**

- [Prisma Docs](https://www.prisma.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [NestJS Docs](https://docs.nestjs.com/)
- `RESET_DATABASE.md` - Documentação do script de reset
- `README.md` - Documentação geral do projeto

---

**Última atualização:** 01/11/2025
