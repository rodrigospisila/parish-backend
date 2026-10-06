// Teste da trava de produção: node prisma/lib/prod-guard.test.cjs
const assert = require('assert');
const { assertNotProduction, isProductionHost, databaseHost } = require('./prod-guard.cjs');

const run = (env, options = {}) => {
  let code = null;
  const errors = console.error;
  const warns = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    const prod = assertNotProduction('teste', { ...options, env, exit: (c) => { code = c; } });
    return { prod, code };
  } finally {
    console.error = errors;
    console.warn = warns;
  }
};

const PROD = 'postgresql://u:p@exemplo.proxy.rlwy.net:12345/railway';
const LOCAL = 'postgresql://u:p@localhost:5432/parish';

assert.strictEqual(databaseHost(PROD), 'exemplo.proxy.rlwy.net');
assert.ok(isProductionHost('exemplo.proxy.rlwy.net', {}));
assert.ok(isProductionHost('postgres.railway.internal', {}));
assert.ok(isProductionHost('x.up.railway.app', {}));
assert.ok(!isProductionHost('localhost', {}));
assert.ok(!isProductionHost('evilrlwy.net', {}), 'só o domínio, não sufixo solto');
assert.ok(isProductionHost('db.minha-empresa.com', { PROD_DB_HOSTS: 'db.minha-empresa.com' }));

// local: segue
assert.deepStrictEqual(run({ DATABASE_URL: LOCAL }), { prod: false, code: null });
// produção sem confirmação: recusa
assert.deepStrictEqual(run({ DATABASE_URL: PROD }), { prod: true, code: 1 });
// produção com CONFIRM_PROD=sim: segue (avisando)
assert.deepStrictEqual(run({ DATABASE_URL: PROD, CONFIRM_PROD: 'sim' }), { prod: true, code: null });
// confirmação errada não vale
assert.deepStrictEqual(run({ DATABASE_URL: PROD, CONFIRM_PROD: 'yes' }), { prod: true, code: 1 });
// never: recusa mesmo com confirmação
assert.deepStrictEqual(run({ DATABASE_URL: PROD, CONFIRM_PROD: 'sim' }, { never: true }), { prod: true, code: 1 });
// modo que não grava (dry-run): não trava
assert.deepStrictEqual(run({ DATABASE_URL: PROD }, { writes: false }), { prod: false, code: null });
// URL ilegível: trata como produção
assert.deepStrictEqual(run({ DATABASE_URL: 'não é url' }), { prod: true, code: 1 });

console.log('prod-guard: ok');
