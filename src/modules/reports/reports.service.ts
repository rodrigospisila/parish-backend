import { Injectable } from '@nestjs/common';
import { AssignmentStatus, MemberStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { PdfService } from '../pdf/pdf.service';

/**
 * Relatórios e indicadores pastorais (roadmap 2.4).
 * Reutiliza a hierarquia de escopo e os dados de membros/pastorais/escalas.
 * Não expõe dados pessoais sensíveis — apenas agregados para decisão.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Visão consolidada para o pároco/conselho, dentro do escopo do usuário:
   * agentes ativos por pastoral, pastorais com lacuna de voluntários e
   * membros sobrecarregados nos próximos 30 dias.
   */
  async getPastoralOverview(currentUser: CurrentUser) {
    const memberWhere = this.hierarchyService.applyMemberFilter(currentUser);
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Agentes ativos no escopo
    const activeMembers = await this.prisma.member.count({
      where: { ...memberWhere, deletedAt: null, status: MemberStatus.ACTIVE },
    });

    // Agentes por pastoral (contagem de vínculos ativos) — mesmo escopo dos membros
    const pastoralScope = this.pastoralScope(currentUser);

    const pastorals = !pastoralScope
      ? []
      : await this.prisma.communityPastoral.findMany({
          where: { ...pastoralScope, deletedAt: null },
          select: {
            id: true,
            globalPastoral: { select: { name: true, kind: true } },
            community: { select: { name: true } },
            _count: {
              select: { members: { where: { isActive: true, member: { deletedAt: null } } } },
            },
          },
        });

    const agentsByPastoral = pastorals.map((pastoral) => ({
      pastoralId: pastoral.id,
      name: pastoral.globalPastoral.name,
      kind: pastoral.globalPastoral.kind,
      community: pastoral.community.name,
      activeAgents: pastoral._count.members,
    }));

    // Sobrecarga: membros com muitas atribuições futuras (não recusadas)
    const upcomingAssignments = await this.prisma.scheduleAssignment.groupBy({
      by: ['memberId'],
      where: {
        status: { not: AssignmentStatus.DECLINED },
        schedule: { deletedAt: null, date: { gte: now, lte: in30Days } },
        member: { ...memberWhere, deletedAt: null },
      },
      _count: { _all: true },
      having: { memberId: { _count: { gte: 4 } } },
    });

    const overloadedMemberIds = upcomingAssignments.map((assignment) => assignment.memberId);
    const overloadedMembers = overloadedMemberIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: overloadedMemberIds } },
          select: { id: true, fullName: true },
        })
      : [];

    const overloaded = upcomingAssignments
      .map((assignment) => ({
        memberId: assignment.memberId,
        name: overloadedMembers.find((member) => member.id === assignment.memberId)?.fullName ?? '—',
        upcomingCount: assignment._count._all,
      }))
      .sort((a, b) => b.upcomingCount - a.upcomingCount);

    return {
      scope: {
        communityId: currentUser.communityId ?? null,
        parishId: currentUser.parishId ?? null,
        dioceseId: currentUser.dioceseId ?? null,
      },
      generatedAt: now.toISOString(),
      totals: {
        activeMembers,
        pastorals: pastorals.length,
        overloadedMembers: overloaded.length,
      },
      agentsByPastoral,
      overloaded,
    };
  }

  /**
   * Escopo das pastorais pelo PAPEL (alinhado ao applyMemberFilter). Negar por
   * padrão: sem o escopo correspondente no cadastro, `null` (nada a agregar) —
   * antes caía no país inteiro.
   */
  private pastoralScope(user: CurrentUser): Record<string, unknown> | null {
    switch (user.role) {
      case UserRole.SYSTEM_ADMIN:
        return {};
      case UserRole.DIOCESAN_ADMIN:
        return user.dioceseId ? { community: { parish: { dioceseId: user.dioceseId } } } : null;
      case UserRole.PARISH_ADMIN:
        return user.parishId ? { community: { parishId: user.parishId } } : null;
      case UserRole.COMMUNITY_COORDINATOR:
      case UserRole.PASTORAL_COORDINATOR:
        return user.communityId ? { communityId: user.communityId } : null;
      default:
        return null;
    }
  }

  async exportPastoralOverviewPdf(currentUser: CurrentUser): Promise<Buffer> {
    const overview = await this.getPastoralOverview(currentUser);

    return this.pdfService.renderTableDocument({
      title: 'Relatório Pastoral',
      subtitle: `Agentes ativos: ${overview.totals.activeMembers} · Pastorais: ${overview.totals.pastorals}`,
      sections: [
        {
          heading: 'Agentes por pastoral',
          columns: ['Pastoral', 'Tipo', 'Comunidade', 'Agentes ativos'],
          widths: [3, 1.5, 2.5, 1.5],
          rows: overview.agentsByPastoral.map((row) => [
            row.name,
            row.kind,
            row.community,
            String(row.activeAgents),
          ]),
        },
        {
          heading: 'Membros sobrecarregados (30 dias)',
          columns: ['Membro', 'Escalas futuras'],
          widths: [4, 1.5],
          rows: overview.overloaded.length
            ? overview.overloaded.map((row) => [row.name, String(row.upcomingCount)])
            : [['Nenhum membro sobrecarregado', '—']],
        },
      ],
      footer: `Emitido em ${new Date().toLocaleString('pt-BR')}`,
    });
  }
}
