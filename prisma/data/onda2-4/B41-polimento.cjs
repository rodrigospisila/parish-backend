/**
 * B41 — polimento de cadastro.
 *
 *   1. Sugestões de pino PENDENTES em comunidades cujo pino já foi conferido (geoVerifiedAt)
 *      ou é MANUAL: viram SUPERSEDED. Aceitar uma por engano na fila trocaria um pino
 *      verificado por um palpite. (O carregador prisma/carregar-candidatos.ts passou a
 *      ignorar essas comunidades.)
 *   2. Telefone e e-mail gravados como texto vazio ('') nas comunidades viram NULL — o app
 *      mostrava o botão de ligar sem número.
 *   3. CEP: "13150000" vira "13150-000" (o resto do cadastro usa hífen). CEP ausente não tem
 *      correção automática — fica só contado no relatório (não se inventa CEP).
 *   4. Só com --apagar-smoke: apaga as transações financeiras de smoke test ("(smoke)",
 *      "Visitante Teste", "[TESTE]", "Teste centavos") da paróquia de teste Santa Rita de
 *      Cássia (Ponta Grossa) e as sem paróquia; estornos antes dos originais. Nunca toca
 *      em Imbituva. Campanhas e intenções de dízimo de teste ficam (são do mesmo reset).
 *
 *   node prisma/data/onda2-4/B41-polimento.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/B41-polimento.cjs --env=... --apply [--apagar-smoke]
 */
const { iniciar } = require('./_comum.cjs');

const ITEM = 'B41';
const IMBITUVA = 'cmrxqe3eg00htcv4c7g2z3rvy';
const PAROQUIA_TESTE = 'cmrb9fchf0005cvq4nva4beii'; // Santa Rita de Cássia — Ponta Grossa (contas de smoke)
const SMOKE = String.raw`\(smoke\)|visitante teste|\[teste\]|teste centavos`;

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  const apagarSmoke = ctx.argv.includes('--apagar-smoke');
  await ctx.preparar();

  const candidatos = await prisma.$queryRawUnsafe(`
    SELECT g.id, g.source, g.reason, c.name, c.city, c.state, c."geoPrecision"::text AS precisao, split_part(coalesce(c."geoVerifiedBy", ''), ':', 1) AS conferido_por
      FROM community_geo_candidates g JOIN communities c ON c.id = g."communityId"
     WHERE g.status = 'PENDING' AND (c."geoPrecision" = 'MANUAL' OR c."geoVerifiedAt" IS NOT NULL)`);
  const [vazios] = await prisma.$queryRawUnsafe(`
    SELECT count(*) FILTER (WHERE phone = '')::int telefone, count(*) FILTER (WHERE email = '')::int email FROM communities`);
  const [cep] = await prisma.$queryRawUnsafe(`
    SELECT count(*) FILTER (WHERE "zipCode" ~ '^[0-9]{8}$')::int sem_hifen,
           count(*) FILTER (WHERE "zipCode" = '')::int ausente,
           count(*) FILTER (WHERE "zipCode" <> '' AND "zipCode" !~ '^[0-9]{5}-?[0-9]{3}$')::int invalido
      FROM communities WHERE "deletedAt" IS NULL`);
  const [cepParoquia] = await prisma.$queryRawUnsafe(`
    SELECT count(*) FILTER (WHERE "zipCode" ~ '^[0-9]{8}$')::int sem_hifen, count(*) FILTER (WHERE "zipCode" = '')::int ausente FROM parishes`);
  const smoke = await prisma.$queryRawUnsafe(
    `SELECT id, "reversalOfId" IS NOT NULL estorno, "parishId", amount FROM financial_transactions
      WHERE description ~* $1 AND ("parishId" = $2 OR "parishId" IS NULL) AND "parishId" IS DISTINCT FROM $3`,
    SMOKE, PAROQUIA_TESTE, IMBITUVA);
  const [smokeFora] = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int n FROM financial_transactions WHERE description ~* $1 AND "parishId" IS NOT NULL AND "parishId" <> $2`, SMOKE, PAROQUIA_TESTE);
  const [zz] = await prisma.$queryRawUnsafe(`
    SELECT (SELECT count(*) FROM communities WHERE name ~* '^zz\\M')::int comunidades,
           (SELECT count(*) FROM communities WHERE name ~* '^zz\\M' AND "deletedAt" IS NULL)::int comunidades_ativas,
           (SELECT count(*) FROM events WHERE title ~* '^zz\\M')::int eventos,
           (SELECT count(*) FROM events WHERE title ~* '^zz\\M' AND "deletedAt" IS NULL)::int eventos_ativos,
           (SELECT count(*) FROM members WHERE "fullName" ~* '^zz\\M')::int membros,
           (SELECT count(*) FROM members WHERE "fullName" ~* '^zz\\M' AND "deletedAt" IS NULL)::int membros_ativos`);

  const tot = {
    sugestoesEmPinoConferido: candidatos.length,
    telefoneVazio: vazios.telefone, emailVazio: vazios.email,
    cepSemHifen: cep.sem_hifen, cepAusente: cep.ausente, cepInvalido: cep.invalido,
    paroquias: cepParoquia,
    transacoesSmoke: smoke.length, estornosSmoke: smoke.filter((t) => t.estorno).length, transacoesSmokeEmOutraParoquia: smokeFora.n,
    residuosZZ: zz,
  };
  console.log(tot);
  console.log('prévia:', ctx.salvarPrevia({ tot, candidatos }));
  if (!apply) return prisma.$disconnect();

  ctx.salvarBackup({
    candidatos: await prisma.communityGeoCandidate.findMany({ where: { id: { in: candidatos.map((c) => c.id) } } }),
    vazios: await prisma.community.findMany({ where: { OR: [{ phone: '' }, { email: '' }] }, select: { id: true, phone: true, email: true } }),
    cep: await prisma.$queryRawUnsafe(`SELECT id, "zipCode" FROM communities WHERE "zipCode" ~ '^[0-9]{8}$'`),
    smoke: apagarSmoke ? await prisma.financialTransaction.findMany({ where: { id: { in: smoke.map((t) => t.id) } } }) : [],
  });
  const agora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.communityGeoCandidate.updateMany({ where: { id: { in: candidatos.map((c) => c.id) }, status: 'PENDING' }, data: { status: 'SUPERSEDED', resolvedAt: agora } });
    await tx.community.updateMany({ where: { phone: '' }, data: { phone: null } });
    await tx.community.updateMany({ where: { email: '' }, data: { email: null } });
    await tx.$executeRawUnsafe(`UPDATE communities SET "zipCode" = substr("zipCode", 1, 5) || '-' || substr("zipCode", 6, 3) WHERE "zipCode" ~ '^[0-9]{8}$'`);
    if (apagarSmoke && smoke.length) {
      await tx.financialTransaction.deleteMany({ where: { id: { in: smoke.filter((t) => t.estorno).map((t) => t.id) } } });
      await tx.financialTransaction.deleteMany({ where: { id: { in: smoke.filter((t) => !t.estorno).map((t) => t.id) } } });
    }
  }, { timeout: 120000 });
  console.log(`[${ITEM}] feito${apagarSmoke ? ' (com smoke)' : ''}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
