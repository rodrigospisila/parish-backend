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
echo "   - Criar um usuário SYSTEM_ADMIN padrão"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Operação cancelada pelo usuário"
  exit 0
fi

echo ""
echo "🗑️  Passo 1/3: Resetando banco de dados..."
pnpm prisma migrate reset --force --skip-seed

echo ""
echo "🔧 Passo 2/3: Aplicando migrations..."
pnpm prisma migrate deploy

echo ""
echo "👤 Passo 3/3: Criando usuário SYSTEM_ADMIN..."
pnpm prisma db seed

echo ""
echo "✅ Reset concluído com sucesso!"
echo ""
echo "📋 Credenciais do SYSTEM_ADMIN:"
echo "   Email: system@parish.app"
echo "   Senha: System@Admin123"
echo ""
echo "⚠️  IMPORTANTE: Altere a senha após o primeiro login!"
echo ""
