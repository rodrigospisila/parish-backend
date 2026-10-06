/**
 * globalSetup dos testes e2e: eles apagam tabelas inteiras (deleteMany em users,
 * members, parishes, dioceses...). Nunca contra produção — nem com CONFIRM_PROD —
 * e, fora dela, só num banco cujo nome indique teste (…_e2e / …_test), a menos que
 * E2E_ALLOW_ANY_DB=sim (ex.: banco local descartável com outro nome).
 */
const { assertNotProduction, readDatabaseUrl } = require('../prisma/lib/prod-guard.cjs');

module.exports = async () => {
  assertNotProduction('testes e2e', { never: true });
  const url = readDatabaseUrl();
  let dbName = '';
  try {
    dbName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    // URL ilegível: trata como banco desconhecido
  }
  if (!/(_e2e|_test)$/i.test(dbName) && process.env.E2E_ALLOW_ANY_DB !== 'sim') {
    console.error(
      `[testes e2e] RECUSADO: o banco "${dbName || '?'}" não parece de teste (os e2e apagam tabelas inteiras). ` +
        'Use um banco terminado em _e2e/_test ou rode com E2E_ALLOW_ANY_DB=sim.',
    );
    process.exit(1);
  }
};
