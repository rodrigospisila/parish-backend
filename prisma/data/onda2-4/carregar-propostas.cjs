/**
 * Carrega na fila de aprovação (data_proposals, revisada no /admin/map do painel) um
 * arquivo de propostas gerado pelos scripts desta pasta (ex.: saida/M25-propostas.json).
 * Nada é aplicado ao dado: a proposta só aparece na fila para o SYSTEM_ADMIN aprovar.
 *
 * Idempotente: pula a proposta se já existe uma com o mesmo lote + tipo + horário
 * (ou comunidade, quando não há horário). Também pula quando o horário já não está
 * como em `current` (mudou desde a prévia — a aprovação recusaria de qualquer jeito).
 *
 *   node prisma/data/onda2-4/carregar-propostas.cjs --env=.env.imbituva --arquivo=saida/M25-propostas.json
 *   CONFIRM_PROD=sim node prisma/data/onda2-4/carregar-propostas.cjs --env=... --arquivo=... --apply
 */
const fs = require('fs');
const path = require('path');
const { iniciar } = require('./_comum.cjs');

(async () => {
  const ctx = iniciar('carregar-propostas');
  const { prisma, apply } = ctx;
  const arg = ctx.argv.find((a) => a.startsWith('--arquivo='));
  if (!arg) { console.error('informe --arquivo=saida/<item>-propostas.json'); process.exit(1); }
  const arquivo = path.resolve(__dirname, arg.slice(10));
  const propostas = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  await ctx.preparar();

  const novas = [];
  let jaExiste = 0;
  let mudou = 0;
  for (const p of propostas) {
    const igual = await prisma.dataProposal.findFirst({
      where: { batch: p.batch, kind: p.kind, ...(p.massScheduleId ? { massScheduleId: p.massScheduleId } : { communityId: p.communityId ?? null, parishId: p.parishId ?? null }) },
      select: { id: true },
    });
    if (igual) { jaExiste += 1; continue; }
    if (p.massScheduleId && p.current) {
      const h = await prisma.massSchedule.findUnique({ where: { id: p.massScheduleId } });
      const bate = h && Object.entries(p.current).every(([k, v]) => JSON.stringify(v ?? null) === JSON.stringify(h[k] ?? null));
      if (!bate) { mudou += 1; continue; }
    }
    novas.push(p);
  }
  console.log({ arquivo: path.basename(arquivo), total: propostas.length, novas: novas.length, jaExiste, mudouDesdeAPrevia: mudou });
  if (!apply) return prisma.$disconnect();

  const r = await prisma.dataProposal.createMany({
    data: novas.map(({ kind, status, communityId, parishId, massScheduleId, payload, current, evidenceUrl, evidenceQuote, sourceKind, confidence, reason, batch, city, state }) => ({
      kind, status: status || 'PENDING', communityId: communityId ?? null, parishId: parishId ?? null, massScheduleId: massScheduleId ?? null,
      payload: payload ?? undefined, current: current ?? undefined, evidenceUrl: evidenceUrl ?? null, evidenceQuote: evidenceQuote ?? null,
      sourceKind: sourceKind ?? null, confidence: confidence ?? null, reason: reason ?? null, batch, city: city ?? null, state: state ?? null,
    })),
  });
  console.log(`propostas carregadas: ${r.count}`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
