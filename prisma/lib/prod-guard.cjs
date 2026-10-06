/**
 * Trava de produção dos scripts que gravam ou apagam dados (achado B55 da auditoria).
 *
 * O fluxo da equipe exporta a URL de produção no shell (`set -a && . ./.env.imbituva`).
 * Nessa sessão, um `npm run db:reset` ou um seed de teste apagaria/poluiria a
 * produção sem perguntar nada. Todo script que grava chama, ANTES de abrir o
 * PrismaClient (e depois de carregar o próprio --env, se tiver):
 *
 *   const { assertNotProduction } = require('./lib/prod-guard.cjs');
 *   assertNotProduction('seed-santos');                    // sempre grava
 *   assertNotProduction('geocode-fontes', { writes: !DRY }); // só no modo que grava
 *   assertNotProduction('reset-database', { never: true });  // nunca em produção
 *
 * Banco de produção = host do DATABASE_URL terminando em rlwy.net, railway.app ou
 * railway.internal, ou listado em PROD_DB_HOSTS (separado por vírgula). Contra
 * produção, só segue com CONFIRM_PROD=sim no ambiente (a mesma convenção dos
 * scripts de prisma/data/onda2-4). Fora da produção, não faz nada.
 *
 * Sem DATABASE_URL no ambiente, lê o do .env da raiz do backend — o PrismaClient
 * faz o mesmo, então a trava olha a URL que o script vai de fato usar.
 */
const fs = require('fs');
const path = require('path');

const PROD_HOST = /(^|\.)(rlwy\.net|railway\.app|railway\.internal)$/i;

function readDatabaseUrl(env = process.env) {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const envFile = path.resolve(__dirname, '..', '..', '.env');
  if (!fs.existsSync(envFile)) return undefined;
  const line = fs
    .readFileSync(envFile, 'utf8')
    .split(/\r?\n/)
    .find((l) => /^\s*(export\s+)?DATABASE_URL\s*=/.test(l));
  if (!line) return undefined;
  return line.replace(/^\s*(export\s+)?DATABASE_URL\s*=\s*/, '').replace(/^["']|["']\s*$/g, '').trim();
}

function databaseHost(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isProductionHost(host, env = process.env) {
  if (!host) return false;
  const extra = (env.PROD_DB_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return PROD_HOST.test(host) || extra.includes(host);
}

/**
 * Encerra o processo (exit 1) se o script for gravar em produção sem
 * CONFIRM_PROD=sim. `never: true` recusa produção mesmo com a confirmação.
 * Devolve true quando o alvo é produção (confirmado), false caso contrário.
 */
function assertNotProduction(scriptName, options = {}) {
  const { writes = true, never = false, env = process.env, exit = (code) => process.exit(code) } = options;
  if (!writes) return false;
  const url = readDatabaseUrl(env);
  if (!url) return false; // sem banco configurado o PrismaClient falha sozinho
  const host = databaseHost(url);
  // URL que não se deixa ler: trata como produção (melhor recusar que adivinhar)
  const prod = host === null || isProductionHost(host, env);
  if (!prod) return false;
  const alvo = host ?? '(host ilegível)';
  if (never) {
    console.error(`[${scriptName}] RECUSADO: o DATABASE_URL aponta para PRODUÇÃO (${alvo}). Este script nunca roda em produção.`);
    exit(1);
    return true;
  }
  if (env.CONFIRM_PROD !== 'sim') {
    console.error(
      `[${scriptName}] RECUSADO: o DATABASE_URL aponta para PRODUÇÃO (${alvo}). ` +
        'Para gravar lá de propósito, rode de novo com CONFIRM_PROD=sim no ambiente. Nada foi feito.',
    );
    exit(1);
    return true;
  }
  console.warn(`[${scriptName}] ATENÇÃO: gravando no banco de PRODUÇÃO (${alvo}) — CONFIRM_PROD=sim.`);
  return true;
}

module.exports = { assertNotProduction, isProductionHost, databaseHost, readDatabaseUrl, PROD_HOST };
