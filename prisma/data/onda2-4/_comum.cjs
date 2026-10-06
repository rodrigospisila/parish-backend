/**
 * Base comum dos scripts de correção de dados da auditoria (ondas 2–4, out/2026).
 *
 * Todos os scripts desta pasta seguem o mesmo contrato:
 *   - sem argumento (ou --dry-run): SÓ LÊ. A conexão é aberta com uma única sessão
 *     e `default_transaction_read_only = on` — se algum trecho tentar escrever, o
 *     Postgres recusa. Mostra contagens e grava a prévia em ./saida/<item>-previa.json.
 *   - --apply: grava, mas só com CONFIRM_PROD=sim no ambiente. Antes de gravar, copia
 *     as linhas que vai tocar para ./saida/<item>-backup-<data>.json (para desfazer).
 *   - --env=<arquivo>: carrega DATABASE_URL desse arquivo (ex.: --env=.env.imbituva).
 *
 *   node prisma/data/onda2-4/<item>.cjs --env=.env.imbituva            # dry-run
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/<item>.cjs --env=... --apply
 *
 * A pasta ./saida está no .gitignore: prévias e backups têm ids (e, nos de
 * Imbituva, dados de membros) e não vão para o repositório.
 */
const fs = require('fs');
const path = require('path');

const SAIDA = path.join(__dirname, 'saida');

function iniciar(item) {
  const argv = process.argv.slice(2);
  const env = argv.find((a) => a.startsWith('--env='));
  if (env) require('dotenv').config({ path: path.resolve(process.cwd(), env.slice(6)), override: true });
  else require('dotenv').config();

  const apply = argv.includes('--apply');
  if (apply && process.env.CONFIRM_PROD !== 'sim') {
    console.error(`[${item}] --apply exige CONFIRM_PROD=sim no ambiente. Nada foi feito.`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error(`[${item}] DATABASE_URL ausente (use --env=<arquivo>).`);
    process.exit(1);
  }

  // Dry-run: uma conexão só, para o SET de sessão valer em todas as consultas
  let url = process.env.DATABASE_URL;
  if (!apply) url += (url.includes('?') ? '&' : '?') + 'connection_limit=1';
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  fs.mkdirSync(SAIDA, { recursive: true });
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');

  return {
    prisma,
    apply,
    argv,
    /** Trava a sessão em somente leitura no dry-run e confere que travou. */
    async preparar() {
      if (apply) {
        console.log(`[${item}] *** --apply: GRAVANDO em ${new URL(process.env.DATABASE_URL).host} ***`);
        return;
      }
      await prisma.$executeRawUnsafe('SET default_transaction_read_only = on');
      const [r] = await prisma.$queryRawUnsafe('SHOW default_transaction_read_only');
      if (r.default_transaction_read_only !== 'on') throw new Error('não consegui travar a sessão em somente leitura');
      console.log(`[${item}] DRY-RUN (sessão somente leitura) — nada será gravado`);
    },
    salvarPrevia(dados) {
      const f = path.join(SAIDA, `${item}-previa.json`);
      fs.writeFileSync(f, JSON.stringify(dados, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 1));
      return f;
    },
    salvarBackup(dados) {
      const f = path.join(SAIDA, `${item}-backup-${carimbo}.json`);
      fs.writeFileSync(f, JSON.stringify(dados, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 1));
      console.log(`[${item}] backup: ${f}`);
      return f;
    },
  };
}

/** Nome comparável: sem acento, minúsculo, espaços e traços normalizados. */
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/** Distância em km entre dois pontos (haversine). */
function distKm(a, b) {
  if (a?.latitude == null || b?.latitude == null) return null;
  const r = (x) => (x * Math.PI) / 180;
  const dLat = r(b.latitude - a.latitude);
  const dLon = r(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.latitude)) * Math.cos(r(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** Chave de "mesmo horário": tipo, dia, hora, recorrência, semanas, dia do mês, especial. */
const chaveHorario = (m) =>
  [m.type, m.dayOfWeek ?? '', m.time, m.recurrence, (m.weeksOfMonth || []).join(','), m.dayOfMonth ?? '', m.isSpecial ? 1 : 0, m.specialDate ? new Date(m.specialDate).toISOString().slice(0, 10) : ''].join('|');

module.exports = { iniciar, normalizar, distKm, chaveHorario, SAIDA };
