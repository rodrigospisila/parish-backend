# 🔄 Reset do Banco de Dados Local

Este documento explica como resetar completamente o banco de dados local e criar o usuário SYSTEM_ADMIN padrão.

---

## ⚠️ **ATENÇÃO**

Este script irá:
- ✅ Resetar completamente o banco de dados
- ✅ Apagar **TODOS** os dados existentes
- ✅ Recriar todas as tabelas
- ✅ Criar um usuário SYSTEM_ADMIN padrão

**Use apenas em ambiente de desenvolvimento!**

---

## 📋 **Pré-requisitos**

1. ✅ Node.js instalado
2. ✅ npm instalado (dependências com `npm ci`)
3. ✅ PostgreSQL rodando
4. ✅ Arquivo `.env` configurado com a conexão do banco

---

## 🚀 **Como Usar**

### **Linux/Mac:**

```bash
cd parish-backend
./scripts/reset-database.sh
```

### **Windows:**

```cmd
cd parish-backend
scripts\reset-database.bat
```

### **Manual (qualquer sistema):**

```bash
cd parish-backend

# Resetar banco
npx prisma migrate reset --force --skip-seed

# Aplicar migrations
npx prisma migrate deploy

# Criar SYSTEM_ADMIN
npx prisma db seed
```

---

## 👤 **Credenciais do SYSTEM_ADMIN**

Após executar o script, use estas credenciais para fazer login:

```
Email: system@parish.app
Senha: System@Admin123
```

**⚠️ IMPORTANTE:** Altere a senha após o primeiro login!

---

## 📝 **O que o Script Faz**

### **Passo 1: Reset do Banco**
```bash
npx prisma migrate reset --force --skip-seed
```
- Apaga todas as tabelas
- Remove todos os dados
- Recria o schema do zero

### **Passo 2: Aplicar Migrations**
```bash
npx prisma migrate deploy
```
- Aplica todas as migrations
- Cria todas as tabelas
- Configura relações e índices

### **Passo 3: Seed do SYSTEM_ADMIN**
```bash
npx prisma db seed
```
- Executa o arquivo `prisma/seed.ts`
- Cria o usuário SYSTEM_ADMIN
- Hash da senha com bcrypt

---

## 🔧 **Arquivo de Seed**

O arquivo `prisma/seed.ts` cria o seguinte usuário:

```typescript
{
  name: 'Administrador do Sistema',
  email: 'system@parish.app',
  password: 'System@Admin123', // Hash com bcrypt
  phone: '+55 11 99999-9999',
  role: UserRole.SYSTEM_ADMIN,
  isActive: true,
  forcePasswordChange: false,
}
```

---

## 🛠️ **Personalização**

### **Alterar Credenciais Padrão**

Edite o arquivo `prisma/seed.ts`:

```typescript
const systemAdmin = await prisma.user.create({
  data: {
    name: 'Seu Nome',              // ← Altere aqui
    email: 'seu@email.com',        // ← Altere aqui
    password: hashedPassword,
    phone: '+55 11 99999-9999',    // ← Altere aqui
    role: UserRole.SYSTEM_ADMIN,
    isActive: true,
    forcePasswordChange: false,
  },
});
```

### **Alterar Senha Padrão**

No arquivo `prisma/seed.ts`, linha 23:

```typescript
const hashedPassword = await bcrypt.hash('SuaSenha@123', 10);  // ← Altere aqui
```

---

## 🔍 **Verificação**

Após executar o script, você pode verificar se o usuário foi criado:

### **Via Prisma Studio:**
```bash
npx prisma studio
```

### **Via SQL:**
```sql
SELECT id, name, email, role, "isActive" 
FROM users 
WHERE role = 'SYSTEM_ADMIN';
```

### **Via API:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "system@parish.app",
    "password": "System@Admin123"
  }'
```

---

## ❌ **Solução de Problemas**

### **Erro: "Database does not exist"**

```bash
# Criar banco manualmente
createdb parish_db

# Ou via psql
psql -U postgres
CREATE DATABASE parish_db;
```

### **Erro: "Connection refused"**

Verifique se o PostgreSQL está rodando:

```bash
# Linux/Mac
sudo systemctl status postgresql

# Windows
# Verifique no Gerenciador de Serviços
```

### **Erro: "Permission denied"**

```bash
# Linux/Mac - dar permissão de execução
chmod +x scripts/reset-database.sh
```

### **Erro: "SYSTEM_ADMIN já existe"**

O seed detecta se já existe um SYSTEM_ADMIN e pula a criação. Para forçar:

```bash
# Deletar manualmente via Prisma Studio ou SQL
DELETE FROM users WHERE role = 'SYSTEM_ADMIN';

# Executar seed novamente
npx prisma db seed
```

---

## 📦 **Estrutura de Arquivos**

```
parish-backend/
├── prisma/
│   ├── schema.prisma          # Schema do banco
│   ├── seed.ts                # Script de seed
│   └── migrations/            # Histórico de migrations
├── scripts/
│   ├── reset-database.sh      # Script Linux/Mac
│   └── reset-database.bat     # Script Windows
├── package.json               # Configuração do prisma.seed
└── RESET_DATABASE.md          # Esta documentação
```

---

## 🔒 **Segurança**

### **Produção**

**⚠️ NUNCA use este script em produção!**

Para produção:
1. Use migrations controladas
2. Crie usuários manualmente
3. Use senhas fortes e únicas
4. Ative `forcePasswordChange: true`
5. Use variáveis de ambiente para senhas

### **Desenvolvimento**

- ✅ Pode usar o script livremente
- ✅ Credenciais padrão são aceitáveis
- ✅ Reset frequente é normal
- ⚠️ Não commite o `.env` no Git

---

## 📚 **Comandos Úteis**

### **Ver status das migrations:**
```bash
npx prisma migrate status
```

### **Criar nova migration:**
```bash
npx prisma migrate dev --name nome_da_migration
```

### **Abrir Prisma Studio:**
```bash
npx prisma studio
```

### **Gerar Prisma Client:**
```bash
npx prisma generate
```

### **Validar schema:**
```bash
npx prisma validate
```

---

## ✅ **Checklist de Uso**

Antes de executar o script:

- [ ] Backup dos dados importantes (se houver)
- [ ] PostgreSQL está rodando
- [ ] Arquivo `.env` está configurado
- [ ] Você está no diretório `parish-backend`
- [ ] Tem certeza que quer apagar todos os dados

Após executar o script:

- [ ] Verificar se o usuário foi criado
- [ ] Testar login com as credenciais
- [ ] Alterar senha (opcional em dev)
- [ ] Criar dados de teste se necessário

---

## 🎯 **Próximos Passos**

Após resetar o banco e criar o SYSTEM_ADMIN:

1. **Fazer login:**
```bash
# Via frontend
http://localhost:5173

# Via API
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "system@parish.app", "password": "System@Admin123"}'
```

2. **Criar estrutura inicial:**
   - Criar diocese
   - Criar paróquia
   - Criar comunidade
   - Criar usuários de teste

3. **Testar permissões:**
   - Criar DIOCESAN_ADMIN
   - Criar PARISH_ADMIN
   - Criar COMMUNITY_COORDINATOR
   - Testar filtros e validações

---

## 📞 **Suporte**

Se encontrar problemas:

1. Verifique os logs do PostgreSQL
2. Verifique o arquivo `.env`
3. Tente executar os comandos manualmente
4. Consulte a documentação do Prisma: https://www.prisma.io/docs

---

## 📄 **Licença**

Este script faz parte do projeto Parish Management System.

---

**Última atualização:** 01/11/2025
