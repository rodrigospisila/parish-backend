import { CommunityPlanStatus, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Acesso total para as paróquias do piloto (decisão do Rodrigo, 19/10/2026):
 * todas as comunidades ativas das paróquias abaixo ficam com plano ACTIVE,
 * sem data de fim (contrato sem prazo), na faixa sem limite de membros e com
 * preço zero. Assim nada fica bloqueado nem com PLAN_ENFORCEMENT=on.
 *
 * Cria ou atualiza community_plans e registra um community_plan_events
 * PILOT_FULL_ACCESS por comunidade (com o estado anterior em `data`, para
 * desfazer). Os ids vão para prisma/platform/saida/piloto-acesso-total-<data>.json.
 *
 *   npx ts-node prisma/platform/piloto-acesso-total.ts --dry-run
 *   npx ts-node prisma/platform/piloto-acesso-total.ts --apply
 */

const PILOT_PARISHES: Record<string, string> = {
  cmrxqe3eg00htcv4c7g2z3rvy: 'Santo Antônio — Imbituva (piloto real)',
  cmrb9fchf0005cvq4nva4beii: 'Santa Rita de Cássia — Ponta Grossa (piloto/teste)',
};
const NOTE = 'Piloto — acesso total (decisão de 19/10/2026)';

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  if (apply === argv.includes('--dry-run')) {
    console.error('Use exatamente um de --dry-run ou --apply');
    process.exit(1);
  }
  const { assertNotProduction } = require('../lib/prod-guard.cjs');
  assertNotProduction('piloto-acesso-total', { writes: apply });
  const prisma = new PrismaClient();
  const now = new Date();

  try {
    console.log(apply ? '*** GRAVANDO ***' : '*** DRY RUN — nada será gravado ***');
    const tier = await prisma.planTier.findFirst({
      where: { maxMembers: null, isActive: true },
      orderBy: { sortOrder: 'desc' },
      select: { id: true, key: true, name: true },
    });
    if (!tier) throw new Error('Nenhuma faixa ativa sem limite de membros (PlanTier.maxMembers nulo)');
    console.log(`Faixa: ${tier.name} (${tier.key})\n`);

    const communities = await prisma.community.findMany({
      where: { parishId: { in: Object.keys(PILOT_PARISHES) }, deletedAt: null },
      select: { id: true, name: true, parishId: true, communityPlan: true },
      orderBy: [{ parishId: 'asc' }, { name: 'asc' }],
    });
    for (const c of communities) {
      const p = c.communityPlan;
      console.log(
        `- [${PILOT_PARISHES[c.parishId]}] ${c.name} ${c.id} — hoje: ${p ? `${p.status}${p.trialEndsAt ? ` até ${p.trialEndsAt.toISOString().slice(0, 10)}` : ''}` : 'sem plano (FREE)'}`,
      );
    }
    if (!apply) {
      console.log(`\nDry run: ${communities.length} comunidades. Rode com --apply para gravar.`);
      return;
    }

    const done: Array<{ communityId: string; planId: string; eventId: string; before: unknown }> = [];
    for (const c of communities) {
      const r = await prisma.$transaction(async (tx) => {
        const before = await tx.communityPlan.findUnique({ where: { communityId: c.id } });
        const data = {
          status: CommunityPlanStatus.ACTIVE,
          tierId: tier.id,
          billingCycle: null,
          priceCents: 0,
          trialEndsAt: null,
          currentPeriodEnd: null,
          suspendedAt: null,
          notes: NOTE,
        };
        const plan = before
          ? await tx.communityPlan.update({ where: { communityId: c.id }, data, select: { id: true } })
          : await tx.communityPlan.create({ data: { communityId: c.id, ...data }, select: { id: true } });
        const event = await tx.communityPlanEvent.create({
          data: {
            communityId: c.id,
            action: 'PILOT_FULL_ACCESS',
            fromStatus: before?.status ?? CommunityPlanStatus.FREE,
            toStatus: CommunityPlanStatus.ACTIVE,
            byUserId: null,
            note: NOTE,
            data: { source: 'prisma/platform/piloto-acesso-total.ts', tierKey: tier.key, before: before ? JSON.parse(JSON.stringify(before)) : null },
          },
          select: { id: true },
        });
        return { communityId: c.id, planId: plan.id, eventId: event.id, before };
      });
      done.push(r);
    }

    const outDir = path.join(__dirname, 'saida');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `piloto-acesso-total-${now.toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(outFile, JSON.stringify({ ranAt: now.toISOString(), tier, done }, null, 2));
    console.log(`\n${done.length} comunidades com acesso total. Detalhes em ${outFile}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
