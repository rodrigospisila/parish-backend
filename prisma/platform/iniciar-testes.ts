import { CommunityPlanStatus, Prisma, PrismaClient, UserRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Coloca em TESTE (TRIAL) as comunidades que JÁ USAM a plataforma, para que o
 * bloqueio dos recursos pagos (PLAN_ENFORCEMENT=on) não as pegue de surpresa.
 *
 * "Já usa": tem pastoral, escala, turma de catequese, sala ou documento (não
 * apagados), ou algum usuário com papel acima de FAITHFUL ligado a ela
 * (User.communityId ou vínculo ativo em user_communities). Mesmo critério de
 * COMMUNITY_IN_USE_WHERE em src/modules/plans/platform-plans.service.ts.
 *
 * Não mexe em quem já tem plano (qualquer status). Só CRIA linhas
 * (community_plans + community_plan_events START_TRIAL); os ids criados vão
 * para prisma/platform/saida/iniciar-testes-<data>.json (para desfazer, se
 * preciso).
 *
 *   npx ts-node prisma/platform/iniciar-testes.ts --dry-run [--dias=60]
 *   npx ts-node prisma/platform/iniciar-testes.ts --apply   [--dias=60]
 */

const NOTE = 'entrada em teste — comunidades que já usavam';

const IN_USE: Prisma.CommunityWhereInput[] = [
  { communityPastorals: { some: { deletedAt: null } } },
  { schedules: { some: { deletedAt: null } } },
  { catechesisClasses: { some: { deletedAt: null } } },
  { rooms: { some: { deletedAt: null } } },
  { documents: { some: { deletedAt: null } } },
  { users: { some: { role: { not: UserRole.FAITHFUL } } } },
  { userCommunities: { some: { isActive: true, role: { not: UserRole.FAITHFUL } } } },
];

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const dry = argv.includes('--dry-run');
  if (apply === dry) {
    console.error('Use exatamente um de --dry-run ou --apply (opcional --dias=60)');
    process.exit(1);
  }
  const diasArg = argv.find((a) => a.startsWith('--dias='));
  const dias = diasArg ? Number(diasArg.split('=')[1]) : 60;
  if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
    console.error('--dias precisa ser um inteiro entre 1 e 365');
    process.exit(1);
  }
  return { apply, dias };
}

async function main() {
  const { apply, dias } = parseArgs(process.argv.slice(2));
  const prisma = new PrismaClient();
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + dias * 24 * 60 * 60 * 1000);

  try {
    console.log(apply ? '*** GRAVANDO ***' : '*** DRY RUN — nada será gravado ***');
    console.log(`Teste até ${trialEndsAt.toISOString()} (${dias} dias)\n`);

    const communities = await prisma.community.findMany({
      where: { deletedAt: null, communityPlan: { is: null }, OR: IN_USE },
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        parish: { select: { name: true } },
        _count: {
          select: {
            communityPastorals: { where: { deletedAt: null } },
            schedules: { where: { deletedAt: null } },
            catechesisClasses: { where: { deletedAt: null } },
            rooms: { where: { deletedAt: null } },
            documents: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ state: 'asc' }, { city: 'asc' }, { name: 'asc' }],
    });

    const alreadyWithPlan = await prisma.communityPlan.count();
    console.log(`Comunidades que já usam e ainda sem plano: ${communities.length}`);
    console.log(`(já com plano, ignoradas: ${alreadyWithPlan})\n`);

    for (const c of communities) {
      const k = c._count;
      console.log(
        `- ${c.name} — ${c.city}/${c.state} (${c.parish?.name ?? '?'}) ` +
          `[pastorais ${k.communityPastorals}, escalas ${k.schedules}, turmas ${k.catechesisClasses}, ` +
          `salas ${k.rooms}, docs ${k.documents}] ${c.id}`,
      );
    }

    if (!apply) {
      console.log('\nDry run: nada gravado. Rode com --apply para criar os testes.');
      return;
    }

    const created: Array<{ communityId: string; planId: string; eventId: string }> = [];
    for (const c of communities) {
      const result = await prisma.$transaction(async (tx) => {
        // Corrida com o painel: se alguém criou o plano no meio, não sobrescreve
        const existing = await tx.communityPlan.findUnique({ where: { communityId: c.id }, select: { id: true } });
        if (existing) return null;
        const plan = await tx.communityPlan.create({
          data: { communityId: c.id, status: CommunityPlanStatus.TRIAL, trialEndsAt },
          select: { id: true },
        });
        const event = await tx.communityPlanEvent.create({
          data: {
            communityId: c.id,
            action: 'START_TRIAL',
            fromStatus: CommunityPlanStatus.FREE,
            toStatus: CommunityPlanStatus.TRIAL,
            byUserId: null,
            note: NOTE,
            data: { created: true, trialEndsAt: trialEndsAt.toISOString(), source: 'prisma/platform/iniciar-testes.ts' },
          },
          select: { id: true },
        });
        return { communityId: c.id, planId: plan.id, eventId: event.id };
      });
      if (result) created.push(result);
    }

    const outDir = path.join(__dirname, 'saida');
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = now.toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(outDir, `iniciar-testes-${stamp}.json`);
    fs.writeFileSync(
      outFile,
      JSON.stringify({ ranAt: now.toISOString(), dias, trialEndsAt: trialEndsAt.toISOString(), created }, null, 2),
    );

    console.log(`\nCriados ${created.length} testes. Ids gravados em ${outFile}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
