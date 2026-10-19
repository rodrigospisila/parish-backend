import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingAccountStatus, CommunityPlanStatus, EntityStatus, MemberStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';

/**
 * "Primeiros passos" da paróquia (C5 — saas-implantacao-08 / ux-dashboards-10):
 * checklist calculado dos dados reais, com consultas leves (count), para o
 * cartão do Início. Some quando dispensado (Parish.onboardingDismissedAt) —
 * o painel também pode escondê-lo aos 100%.
 */

/** Rotas do painel (parish-web/src/App.tsx). */
export const ONBOARDING_HREFS = {
  communities: '/admin/communities',
  massSchedules: '/admin/fixed-schedule',
  pastorals: '/admin/pastorals/community',
  team: '/admin/users',
  members: '/admin/members',
  pix: '/admin/finance',
  catechesis: '/admin/catechesis',
  billing: '/admin/meu-plano',
} as const;

export type OnboardingKey = keyof typeof ONBOARDING_HREFS;

/** "Primeiros membros": a partir de quantos cadastros ativos o passo conta como feito. */
export const MEMBERS_DONE_THRESHOLD = 10;

/** Papéis que contam como "equipe" (além de quem está vendo o checklist). */
const STAFF_ROLES: UserRole[] = [
  UserRole.PARISH_ADMIN,
  UserRole.COMMUNITY_COORDINATOR,
  UserRole.PASTORAL_COORDINATOR,
];

export interface OnboardingItem {
  key: OnboardingKey;
  label: string;
  done: boolean;
  count?: number;
  href: string;
}

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Paróquia do checklist: PARISH_ADMIN só a própria (parishId opcional);
   * DIOCESAN_ADMIN as da diocese; SYSTEM_ADMIN qualquer. Negar por padrão.
   */
  private async resolveParish(user: CurrentUser, parishId?: string) {
    const id = (parishId || '').trim() || (user.role === UserRole.PARISH_ADMIN ? user.parishId : undefined);
    if (!id) throw new BadRequestException('Informe a paróquia (parishId)');
    const parish = await this.prisma.parish.findUnique({
      where: { id },
      select: {
        id: true,
        dioceseId: true,
        onboardingDismissedAt: true,
        titheEnabled: true,
        pixKey: true,
        providerConfiguredAt: true,
      },
    });
    if (!parish) throw new NotFoundException('Paróquia não encontrada');
    const allowed =
      user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.DIOCESAN_ADMIN && !!user.dioceseId && user.dioceseId === parish.dioceseId) ||
      (user.role === UserRole.PARISH_ADMIN && !!user.parishId && user.parishId === parish.id);
    if (!allowed) throw new ForbiddenException('Você não tem acesso a esta paróquia');
    return parish;
  }

  async checklist(user: CurrentUser, parishId?: string, now: Date = new Date()) {
    const parish = await this.resolveParish(user, parishId);
    const communityRows = await this.prisma.community.findMany({
      where: { parishId: parish.id, deletedAt: null },
      select: { id: true, status: true },
    });
    const communityIds = communityRows.map((c) => c.id);
    const activeCommunities = communityRows.filter((c) => c.status === EntityStatus.ACTIVE).length;
    const inParish = { in: communityIds };

    const [massSchedules, pastorals, staff, invites, members, classes, paidPlans, billingAccount] = await Promise.all([
      this.prisma.massSchedule.count({ where: { communityId: inParish } }),
      this.prisma.communityPastoral.count({
        where: { communityId: inParish, deletedAt: null, status: EntityStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: {
          id: { not: user.id },
          isActive: true,
          anonymizedAt: null,
          role: { in: STAFF_ROLES },
          OR: [{ parishId: parish.id }, { communityId: inParish }],
        },
      }),
      // Convite enviado (pendente e no prazo, ou já aceito) também conta
      this.prisma.userInvite.count({
        where: {
          revokedAt: null,
          OR: [{ parishId: parish.id }, { communityId: inParish }],
          AND: [{ OR: [{ acceptedAt: { not: null } }, { expiresAt: { gt: now } }] }],
        },
      }),
      this.prisma.member.count({
        where: { communityId: inParish, deletedAt: null, status: MemberStatus.ACTIVE },
      }),
      this.prisma.catechesisClass.count({ where: { communityId: inParish, deletedAt: null } }),
      this.prisma.communityPlan.count({ where: { communityId: inParish, status: CommunityPlanStatus.ACTIVE } }),
      this.prisma.billingAccount.findUnique({ where: { parishId: parish.id }, select: { status: true } }),
    ]);

    const pixReady = parish.titheEnabled && (!!parish.pixKey || !!parish.providerConfiguredAt);
    const billingReady =
      paidPlans > 0 ||
      billingAccount?.status === BillingAccountStatus.ACTIVE ||
      billingAccount?.status === BillingAccountStatus.PENDING;

    const items: OnboardingItem[] = [
      {
        key: 'communities',
        label: 'Conferir os dados da paróquia e das comunidades (endereço, telefone, pino no mapa)',
        done: activeCommunities > 0,
        count: activeCommunities,
        href: ONBOARDING_HREFS.communities,
      },
      {
        key: 'massSchedules',
        label: 'Confirmar os horários de missa e confissão',
        done: massSchedules > 0,
        count: massSchedules,
        href: ONBOARDING_HREFS.massSchedules,
      },
      {
        key: 'pastorals',
        label: 'Ativar as pastorais das comunidades',
        done: pastorals > 0,
        count: pastorals,
        href: ONBOARDING_HREFS.pastorals,
      },
      {
        key: 'team',
        label: 'Convidar a equipe (secretaria, coordenadores)',
        done: staff > 0 || invites > 0,
        count: staff,
        href: ONBOARDING_HREFS.team,
      },
      {
        key: 'members',
        label: 'Cadastrar ou importar os membros',
        done: members >= MEMBERS_DONE_THRESHOLD,
        count: members,
        href: ONBOARDING_HREFS.members,
      },
      {
        key: 'pix',
        label: 'Configurar o dízimo e a chave Pix',
        done: pixReady,
        href: ONBOARDING_HREFS.pix,
      },
      {
        key: 'catechesis',
        label: 'Montar as etapas e turmas da catequese',
        done: classes > 0,
        count: classes,
        href: ONBOARDING_HREFS.catechesis,
      },
      {
        key: 'billing',
        label: 'Escolher o plano das comunidades',
        done: billingReady,
        count: paidPlans,
        href: ONBOARDING_HREFS.billing,
      },
    ];

    return {
      parishId: parish.id,
      dismissed: !!parish.onboardingDismissedAt,
      progress: { done: items.filter((item) => item.done).length, total: items.length },
      items,
    };
  }

  /** Dispensa (ou, com `dismissed: false`, traz de volta) o cartão "Primeiros passos". */
  async dismiss(user: CurrentUser, parishId?: string, dismissed = true) {
    const parish = await this.resolveParish(user, parishId);
    const updated = await this.prisma.parish.update({
      where: { id: parish.id },
      data: { onboardingDismissedAt: dismissed ? new Date() : null },
      select: { id: true, onboardingDismissedAt: true },
    });
    return {
      parishId: updated.id,
      dismissed: !!updated.onboardingDismissedAt,
      dismissedAt: updated.onboardingDismissedAt,
    };
  }
}
