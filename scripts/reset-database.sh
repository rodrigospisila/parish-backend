#!/bin/bash

# Script para resetar banco de dados local e criar SYSTEM_ADMIN
# Uso: ./scripts/reset-database.sh

set -e  # Parar em caso de erro

echo "🔄 Iniciando reset do banco de dados..."
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
  echo "❌ Erro: Execute este script a partir do diretório raiz do projeto backend"
  exit 1
fi

# Verificar se o arquivo .env existe
if [ ! -f ".env" ]; then
  echo "❌ Erro: Arquivo .env não encontrado"
  exit 1
fi

echo "⚠️  ATENÇÃO: Este script irá:"
echo "   - Resetar completamente o banco de dados"
echo "   - Apagar TODOS os dados existentes"
echo "   - Recriar as tabelas"
echo "   - Aplicar todas as migrations"
echo "   - Criar um usuário SYSTEM_ADMIN padrão"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Operação cancelada pelo usuário"
  exit 0
fi

# Trava de produção (achado B55): nunca reseta o banco do Railway
node -e "require('./prisma/lib/prod-guard.cjs').assertNotProduction('reset-database.sh', { never: true })" || exit 1

echo ""
echo "🗑️  Passo 1/4: Resetando banco de dados..."
npx prisma migrate reset --force --skip-seed || {
  echo "❌ Erro ao resetar banco de dados"
  echo ""
  echo "Tente executar manualmente:"
  echo "  npx prisma migrate reset --force --skip-seed"
  exit 1
}

echo ""
echo "🔧 Passo 2/4: Gerando Prisma Client atualizado..."
npx prisma generate || {
  echo "❌ Erro ao gerar Prisma Client"
  echo ""
  echo "Tente executar manualmente:"
  echo "  npx prisma generate"
  exit 1
}

echo ""
echo "📦 Passo 3/4: Aplicando todas as migrations..."
npx prisma migrate deploy || {
  echo "❌ Erro ao aplicar migrations"
  echo ""
  echo "Tente executar manualmente:"
  echo "  npx prisma migrate deploy"
  exit 1
}

echo ""
echo "👤 Passo 4/4: Criando usuário SYSTEM_ADMIN..."
npx prisma db seed || {
  echo "❌ Erro ao executar seed"
  echo ""
  echo "Tente executar manualmente:"
  echo "  npx prisma db seed"
  exit 1
}

echo ""
echo "✅ Reset concluído com sucesso!"
echo ""
echo "📋 Credenciais do SYSTEM_ADMIN:"
echo "   Email: system@parish.app"
echo "   Senha: System@Admin123"
echo ""
echo "⚠️  IMPORTANTE: Altere a senha após o primeiro login!"
echo ""
