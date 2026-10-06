/**
 * M37 — pinos fora do município (Matriz N. Sra. Aparecida de Aparecida de Minas/MG a ~900 km,
 * com missas e precisão de rua) e as 351 comunidades com cidade fora do padrão IBGE.
 *
 * A correção mora em prisma/validacao/fora-do-municipio.ts, que agora:
 *   - resolve a cidade pela tabela prisma/validacao/apelidos-municipio.json (91 grafias e
 *     distritos → código IBGE) e, sem apelido, pela cidade da paróquia — não pula mais;
 *   - usa 30 km (não 50) para pino de CEP, que é o que deixava passar os de 30–47 km.
 * Este arquivo só repassa o modo, para seguir o contrato da pasta (dry-run por padrão,
 * --apply com CONFIRM_PROD=sim). O --apply leva cada pino fora do município para o centro
 * do município (CITY, ibge-municipio), grava cópia em prisma/data/geo/cache/backup-fora-do-municipio-*.json
 * e nunca toca em pino MANUAL, gps ou conferido.
 *
 *   node prisma/data/onda2-4/M37-pinos-fora-do-municipio.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/M37-pinos-fora-do-municipio.cjs --env=... --apply
 */
const path = require('path');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const env = argv.find((a) => a.startsWith('--env='));
if (env) require('dotenv').config({ path: path.resolve(process.cwd(), env.slice(6)), override: true });
const apply = argv.includes('--apply');
if (apply && process.env.CONFIRM_PROD !== 'sim') {
  console.error('[M37] --apply exige CONFIRM_PROD=sim no ambiente. Nada foi feito.');
  process.exit(1);
}
const raiz = path.join(__dirname, '..', '..', '..');
const r = spawnSync('npx', ['ts-node', 'prisma/validacao/fora-do-municipio.ts', apply ? '--apply' : '--dry-run'], {
  cwd: raiz, env: process.env, stdio: 'inherit', shell: process.platform === 'win32',
});
process.exit(r.status ?? 1);
