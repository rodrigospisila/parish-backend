@echo off
REM Script para resetar banco de dados local e criar SYSTEM_ADMIN (Windows)
REM Uso: scripts\reset-database.bat

echo.
echo ====================================
echo  Reset do Banco de Dados
echo ====================================
echo.

REM Verificar se está no diretório correto
if not exist "package.json" (
  echo [ERRO] Execute este script a partir do diretorio raiz do projeto backend
  pause
  exit /b 1
)

REM Verificar se o arquivo .env existe
if not exist ".env" (
  echo [ERRO] Arquivo .env nao encontrado
  pause
  exit /b 1
)

echo ATENCAO: Este script ira:
echo   - Resetar completamente o banco de dados
echo   - Apagar TODOS os dados existentes
echo   - Recriar as tabelas
echo   - Aplicar todas as migrations
echo   - Criar um usuario SYSTEM_ADMIN padrao
echo.
set /p CONFIRM="Deseja continuar? (S/N): "

if /i not "%CONFIRM%"=="S" (
  echo.
  echo [CANCELADO] Operacao cancelada pelo usuario
  pause
  exit /b 0
)

echo.
echo [1/4] Resetando banco de dados...
call pnpm prisma migrate reset --force --skip-seed
if errorlevel 1 (
  echo [ERRO] Falha ao resetar banco de dados
  echo.
  echo Tente executar manualmente:
  echo   pnpm prisma migrate reset --force --skip-seed
  pause
  exit /b 1
)

echo.
echo [2/4] Gerando Prisma Client atualizado...
call pnpm prisma generate
if errorlevel 1 (
  echo [ERRO] Falha ao gerar Prisma Client
  echo.
  echo Tente executar manualmente:
  echo   pnpm prisma generate
  pause
  exit /b 1
)

echo.
echo [3/4] Aplicando todas as migrations...
call pnpm prisma migrate deploy
if errorlevel 1 (
  echo [ERRO] Falha ao aplicar migrations
  echo.
  echo Tente executar manualmente:
  echo   pnpm prisma migrate deploy
  pause
  exit /b 1
)

echo.
echo [4/4] Criando usuario SYSTEM_ADMIN...
call pnpm prisma db seed
if errorlevel 1 (
  echo [ERRO] Falha ao executar seed
  echo.
  echo Tente executar manualmente:
  echo   pnpm prisma db seed
  pause
  exit /b 1
)

echo.
echo ====================================
echo  Reset concluido com sucesso!
echo ====================================
echo.
echo Credenciais do SYSTEM_ADMIN:
echo   Email: system@parish.app
echo   Senha: System@Admin123
echo.
echo IMPORTANTE: Altere a senha apos o primeiro login!
echo.
pause
