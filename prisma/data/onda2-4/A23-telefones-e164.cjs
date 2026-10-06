/**
 * A23 — telefones de membros fora do padrão E.164 ("(42) 9xxxx-xxxx" em vez de "+5542…").
 *
 * A adoção do cadastro pelo app compara o telefone verificado por SMS (+55…) por igualdade
 * exata com members.phone; o número digitado no painel com máscara nunca casa, e o
 * catequista ganha um membro novo sem as turmas e sem os filhos dependentes. O código novo
 * já normaliza no create/update (create-member.dto.ts / members.service.ts, outra frente);
 * este script normaliza o que JÁ está gravado, com a MESMA regra de
 * src/modules/messaging/log-mask.ts (normalizeBrazilianPhone):
 *   dígitos começando com 55 e 12+ dígitos → "+<dígitos>"; 10 ou 11 dígitos → "+55<dígitos>";
 *   o resto fica como está (listado em "naoNormalizavel").
 * Pula o membro cujo número normalizado já pertence a OUTRO membro ativo ou a um usuário
 * (seria adoção ambígua — conferir à mão).
 *
 * ATENÇÃO: a Paróquia Santo Antônio (Imbituva) é REAL. Este script só roda com --apply
 * por ordem expressa do Rodrigo. Por padrão só olha Imbituva; --todas-paroquias amplia.
 * A prévia (saida/A23-previa.json) tem só ids e o padrão mascarado do número, nunca o número.
 *
 *   node prisma/data/onda2-4/A23-telefones-e164.cjs --env=.env.imbituva
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/A23-telefones-e164.cjs --env=... --apply
 */
const { iniciar } = require('./_comum.cjs');

const ITEM = 'A23';
const IMBITUVA = 'cmrxqe3eg00htcv4c7g2z3rvy';

// Cópia fiel de normalizeBrazilianPhone (src/modules/messaging/log-mask.ts)
const normalizar = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
  if (digits.length === 11 || digits.length === 10) return `+55${digits}`;
  return null;
};
const mascara = (s) => String(s).replace(/\d/g, '9');

(async () => {
  const ctx = iniciar(ITEM);
  const { prisma, apply } = ctx;
  const todas = ctx.argv.includes('--todas-paroquias');
  await ctx.preparar();

  const membros = await prisma.member.findMany({
    where: { deletedAt: null, phone: { not: null }, NOT: { phone: '' }, ...(todas ? {} : { community: { parishId: IMBITUVA } }) },
    select: { id: true, phone: true, userId: true, community: { select: { parishId: true } }, _count: { select: { catechesisCatechistOf: true, dependents: true } } },
  });
  const trocar = [];
  const naoNormalizavel = [];
  const ambiguo = [];
  for (const m of membros) {
    const e164 = normalizar(m.phone);
    if (e164 === m.phone) continue;
    if (!e164) { naoNormalizavel.push({ id: m.id, padrao: mascara(m.phone) }); continue; }
    const outroMembro = await prisma.member.count({ where: { id: { not: m.id }, phone: e164, deletedAt: null } });
    const usuario = await prisma.user.count({ where: { phone: e164 } });
    if (outroMembro || usuario) { ambiguo.push({ id: m.id, padrao: mascara(m.phone), outroMembro, usuario }); continue; }
    trocar.push({ id: m.id, padrao: mascara(m.phone), e164, catequista: m._count.catechesisCatechistOf > 0, responsavel: m._count.dependents > 0, temConta: !!m.userId, imbituva: m.community.parishId === IMBITUVA });
  }

  const tot = {
    escopo: todas ? 'todas as paróquias' : 'Imbituva',
    membrosComTelefone: membros.length,
    normalizar: trocar.length,
    catequistas: trocar.filter((t) => t.catequista).length,
    responsaveis: trocar.filter((t) => t.responsavel).length,
    naoNormalizavel: naoNormalizavel.length,
    ambiguo: ambiguo.length,
    porPadrao: trocar.reduce((m, t) => ((m[t.padrao] = (m[t.padrao] || 0) + 1), m), {}),
  };
  console.log(tot);
  // prévia sem o número: só id, padrão mascarado e papéis
  console.log('prévia:', ctx.salvarPrevia({ tot, trocar: trocar.map(({ e164, ...t }) => t), naoNormalizavel, ambiguo }));
  if (!apply) return prisma.$disconnect();

  ctx.salvarBackup({ antes: await prisma.member.findMany({ where: { id: { in: trocar.map((t) => t.id) } }, select: { id: true, phone: true } }) });
  let n = 0;
  await prisma.$transaction(async (tx) => {
    for (const t of trocar) {
      // só troca se o telefone não mudou desde a leitura
      const atual = await tx.member.findUnique({ where: { id: t.id }, select: { phone: true } });
      if (normalizar(atual?.phone) !== t.e164) continue;
      await tx.member.update({ where: { id: t.id }, data: { phone: t.e164 } });
      n += 1;
    }
  });
  console.log(`[${ITEM}] telefones normalizados: ${n}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
