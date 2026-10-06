import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Optional } from '@nestjs/common';
import { SwapStatus, NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';
import { isRoleAtLeast } from '../auth/constants/role-hierarchy';
import { PlanAccessService } from '../plans/plan-access.service';
import { planFilter } from '../../common/plan-list';

/**
 * Troca de escala entre membros / swap (roadmap 4.6).
 * A troca combinada ("cobre pra mim domingo?") é o fluxo social mais comum e
 * hoje acontece fora do sistema. Aqui é modelado com validação de conflito.
 */
@Injectable()
export class SwapsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly conflictsService: ScheduleConflictsService,
    private readonly hierarchyService: HierarchyService,
    // Plano por comunidade na rota "minhas" (A21). Opcional: specs montam sem ele
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  private async resolveMember(userId: string) {
    return this.prisma.member.findFirst({ where: { userId }, select: { id: true } });
  }

  /**
   * Coordenação com escopo sobre a atribuição: COMMUNITY_COORDINATOR+ com
   * acesso à escala; coordenador de pastoral só se COORDENA a pastoral da
   * atribuição. Fiel/voluntário: nunca. Negar por padrão.
   */
  private async canModerateAssignment(
    user: CurrentUser,
    assignment: { scheduleId: string; communityPastoralId: string | null },
  ): Promise<boolean> {
    if (!user?.id || !user.role || !isRoleAtLeast(user.role, UserRole.PASTORAL_COORDINATOR)) {
      return false;
    }
    if (user.role === UserRole.PASTORAL_COORDINATOR) {
      const coordinated = Array.isArray(user.coordinatedPastoralIds) ? user.coordinatedPastoralIds : [];
      if (!assignment.communityPastoralId || !coordinated.includes(assignment.communityPastoralId)) {
        return false;
      }
    }
    return this.hierarchyService.hasAccessToSchedule(user.id, assignment.scheduleId);
  }

  /**
   * Candidatos para o convite de troca (GET /swaps/candidates): membros ATIVOS
   * da mesma pastoral (ou do mesmo grupo) da atribuição, com vínculo com a
   * comunidade da escala, exceto o dono da atribuição. Só nome — sem contato.
   * Acesso: o dono da atribuição ou a coordenação com escopo.
   */
  async listCandidates(assignmentId: string, user: CurrentUser) {
    if (!assignmentId) throw new BadRequestException('Informe a atribuição');

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        memberId: true,
        scheduleId: true,
        communityPastoralId: true,
        pastoralGroupId: true,
        schedule: {
          select: { communityId: true, deletedAt: true, event: { select: { communityId: true } } },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Atribuição não encontrada');

    const self = await this.resolveMember(user.id);
    const isOwner = !!self && self.id === assignment.memberId;
    if (!isOwner && !(await this.canModerateAssignment(user, assignment))) {
      throw new ForbiddenException('Você só pode convidar colegas para as suas próprias escalas');
    }

    const communityId = assignment.schedule?.event?.communityId ?? assignment.schedule?.communityId ?? null;
    // Sem pastoral/grupo ou sem comunidade não há a quem convidar (negar por padrão)
    if (assignment.schedule?.deletedAt || !communityId) return [];
    const groupFilter = assignment.pastoralGroupId
      ? { pastoralGroupId: assignment.pastoralGroupId }
      : assignment.communityPastoralId
        ? { communityPastoralId: assignment.communityPastoralId }
        : null;
    if (!groupFilter) return [];

    const memberships = await this.prisma.pastoralMember.findMany({
      where: {
        ...groupFilter,
        isActive: true,
        leftAt: null,
        member: {
          id: { not: assignment.memberId },
          deletedAt: null,
          status: 'ACTIVE',
          OR: [{ communityId }, { communityLinks: { some: { communityId, isActive: true } } }],
        },
      },
      select: { member: { select: { id: true, fullName: true } } },
      orderBy: { member: { fullName: 'asc' } },
    });

    const seen = new Set<string>();
    const candidates: Array<{ memberId: string; fullName: string }> = [];
    for (const membership of memberships) {
      if (seen.has(membership.member.id)) continue;
      seen.add(membership.member.id);
      candidates.push({ memberId: membership.member.id, fullName: membership.member.fullName });
    }
    return candidates;
  }

  /** Comunidades onde o membro tem vínculo ativo (principal + secundárias). */
  private async memberCommunityIds(memberId: string): Promise<string[]> {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        communityId: true,
        communityLinks: { where: { isActive: true }, select: { communityId: true } },
      },
    });
    if (!member) return [];
    return [
      ...new Set([member.communityId, ...member.communityLinks.map((link) => link.communityId)]),
    ];
  }

  /** Membro solicita repassar sua atribuição (direcionada a alguém ou aberta). */
  async requestSwap(
    dto: { assignmentId: string; targetMemberId?: string; message?: string },
    user: CurrentUser,
  ) {
    const requester = await this.resolveMember(user.id);
    if (!requester) throw new BadRequestException('Usuário não possui cadastro de membro');

    const assignment = await this.prisma.scheduleAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { schedule: { select: { date: true, deletedAt: true } } },
    });
    if (!assignment) throw new NotFoundException('Atribuição não encontrada');
    if (assignment.memberId !== requester.id) {
      throw new ForbiddenException('Você só pode pedir troca das suas próprias escalas');
    }
    if (assignment.schedule.deletedAt || assignment.schedule.date.getTime() < Date.now()) {
      throw new BadRequestException('Escala inválida ou já passou');
    }

    const swap = await this.prisma.assignmentSwapRequest.create({
      data: {
        assignmentId: dto.assignmentId,
        requesterId: requester.id,
        targetId: dto.targetMemberId ?? null,
        message: dto.message ?? null,
      },
    });
    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'CREATE',
      entity: 'AssignmentSwapRequest',
      entityId: swap.id,
    });

    // Notifica o convidado (troca direcionada), se houver conta de usuário
    if (dto.targetMemberId) {
      const target = await this.prisma.member.findUnique({
        where: { id: dto.targetMemberId },
        select: { userId: true },
      });
      if (target?.userId) {
        await this.notificationsService.notifyUser(
          target.userId,
          NotificationType.TEAM_BROADCAST,
          'Pedido de troca de escala',
          'Um colega pediu que você cubra uma escala. Veja no app.',
          { swapId: swap.id },
        );
      }
    }
    return swap;
  }

  async listMine(user: CurrentUser) {
    const member = await this.resolveMember(user.id);
    if (!member) return { requested: [], invited: [], memberId: null };

    const include = {
      assignment: {
        include: {
          // communityId (da escala ou do evento): plano por comunidade (A21)
          schedule: { select: { id: true, title: true, date: true, communityId: true, event: { select: { communityId: true } } } },
        },
      },
    };
    const linkedCommunityIds = await this.memberCommunityIds(member.id);
    const [allRequested, allInvited] = await Promise.all([
      this.prisma.assignmentSwapRequest.findMany({
        where: { requesterId: member.id },
        include,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.assignmentSwapRequest.findMany({
        where: {
          OR: [
            { targetId: member.id },
            {
              // Trocas ABERTAS: só da mesma pastoral OU de comunidade com vínculo
              targetId: null,
              status: SwapStatus.PENDING,
              assignment: {
                OR: [
                  {
                    communityPastoral: {
                      members: { some: { memberId: member.id, isActive: true } },
                    },
                  },
                  {
                    // Sem pastoral definida: vale o vínculo com a comunidade
                    // (com pastoral, só quem participa dela pode aceitar)
                    communityPastoralId: null,
                    schedule: {
                      OR: [
                        { communityId: { in: linkedCommunityIds } },
                        { event: { communityId: { in: linkedCommunityIds } } },
                      ],
                    },
                  },
                ],
              },
            },
          ],
          NOT: { requesterId: member.id },
        },
        include,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Rota "minhas" (A21): só as trocas de escalas de comunidade com o plano
    const swapCommunity = (swap: (typeof allRequested)[number]) =>
      swap.assignment?.schedule?.communityId ?? swap.assignment?.schedule?.event?.communityId ?? null;
    const requested = await planFilter(this.planAccess, user, allRequested, swapCommunity);
    const invited = await planFilter(this.planAccess, user, allInvited, swapCommunity);

    // Resolve os nomes (requesterId/targetId não têm relação declarada no schema)
    const memberIds = new Set<string>();
    for (const swap of [...requested, ...invited]) {
      memberIds.add(swap.requesterId);
      if (swap.targetId) memberIds.add(swap.targetId);
    }
    const names = memberIds.size
      ? await this.prisma.member.findMany({
          where: { id: { in: Array.from(memberIds) } },
          select: { id: true, fullName: true },
        })
      : [];
    const nameMap = new Map(names.map((m) => [m.id, m.fullName]));
    const decorate = (swap: (typeof requested)[number]) => ({
      ...swap,
      requesterName: nameMap.get(swap.requesterId) ?? null,
      targetName: swap.targetId ? (nameMap.get(swap.targetId) ?? null) : null,
    });

    return {
      requested: requested.map(decorate),
      invited: invited.map(decorate),
      memberId: member.id,
    };
  }

  /** O convidado aceita: valida conflito e transfere a atribuição. */
  async accept(swapId: string, user: CurrentUser, overrideConflict = false) {
    const member = await this.resolveMember(user.id);
    if (!member) throw new BadRequestException('Usuário não possui cadastro de membro');

    const swap = await this.prisma.assignmentSwapRequest.findUnique({
      where: { id: swapId },
      include: { assignment: { include: { schedule: true } } },
    });
    if (!swap) throw new NotFoundException('Pedido de troca não encontrado');
    if (swap.status !== SwapStatus.PENDING) throw new BadRequestException('Pedido não está mais pendente');
    if (swap.targetId && swap.targetId !== member.id) {
      throw new ForbiddenException('Este pedido de troca é direcionado a outro membro');
    }
    if (swap.requesterId === member.id) {
      throw new BadRequestException('Você não pode aceitar seu próprio pedido');
    }

    // Conflito: o novo membro já está escalado nesta mesma escala?
    const existing = await this.prisma.scheduleAssignment.findFirst({
      where: { scheduleId: swap.assignment.scheduleId, memberId: member.id },
    });
    if (existing) throw new BadRequestException('Você já está escalado nesta escala');

    // Sem pastoral na atribuição: exige vínculo ativo com a comunidade da escala
    if (!swap.assignment.communityPastoralId) {
      const schedule = swap.assignment.schedule as any;
      let scheduleCommunityId: string | null = schedule.communityId ?? null;
      if (!scheduleCommunityId && schedule.eventId) {
        const event = await this.prisma.event.findUnique({
          where: { id: schedule.eventId },
          select: { communityId: true },
        });
        scheduleCommunityId = event?.communityId ?? null;
      }
      if (scheduleCommunityId) {
        const allowed = (await this.memberCommunityIds(member.id)).includes(scheduleCommunityId);
        if (!allowed) {
          throw new ForbiddenException(
            'Esta troca é de uma comunidade com a qual você não tem vínculo',
          );
        }
      }
    }

    // O aceitante precisa participar da pastoral da atribuição (quando houver)
    if (swap.assignment.communityPastoralId) {
      const pastoralMember = await this.prisma.pastoralMember.findFirst({
        where: {
          memberId: member.id,
          communityPastoralId: swap.assignment.communityPastoralId,
          isActive: true,
        },
      });
      if (!pastoralMember) {
        throw new BadRequestException(
          'Você não participa da pastoral desta escala, então não pode assumir esta função',
        );
      }
    }

    // Conflito GLOBAL: o aceitante já serve em outra escala no mesmo dia/horário?
    const conflicts = await this.conflictsService.findConflicts(
      [member.id],
      swap.assignment.scheduleId,
    );
    if (conflicts.length > 0 && !overrideConflict) {
      throw new ConflictException({
        message: this.conflictsService.summarize(conflicts),
        code: 'GLOBAL_CONFLICT',
        conflicts,
      });
    }

    const resolved = await this.prisma.$transaction(async (prisma) => {
      await prisma.scheduleAssignment.update({
        where: { id: swap.assignmentId },
        data: { memberId: member.id, status: 'PENDING', respondedAt: null, respondedByUserId: null },
      });
      return prisma.assignmentSwapRequest.update({
        where: { id: swapId },
        data: { status: SwapStatus.ACCEPTED, resolvedAt: new Date() },
      });
    });

    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'UPDATE',
      entity: 'AssignmentSwapRequest',
      entityId: swapId,
      metadata: {
        accepted: true,
        newMemberId: member.id,
        ...(conflicts.length > 0 ? { conflictOverridden: true } : {}),
      },
    });
    return resolved;
  }

  /**
   * Fecha o pedido só se ainda estiver PENDENTE (compare-and-set): um aceite
   * concorrente não pode ser sobrescrito por recusa/cancelamento.
   */
  private async closePending(swapId: string, status: SwapStatus) {
    const { count } = await this.prisma.assignmentSwapRequest.updateMany({
      where: { id: swapId, status: SwapStatus.PENDING },
      data: { status, resolvedAt: new Date() },
    });
    if (count === 0) throw new BadRequestException('Pedido não está mais pendente');
    return this.prisma.assignmentSwapRequest.findUnique({ where: { id: swapId } });
  }

  /**
   * Recusa: só pedido PENDENTE; quem recusa é o convidado (troca direcionada)
   * ou a coordenação com escopo. Troca ABERTA não tem convidado — antes,
   * qualquer logado a "recusava" e o pedido sumia para todos.
   */
  async reject(swapId: string, user: CurrentUser) {
    const swap = await this.prisma.assignmentSwapRequest.findUnique({
      where: { id: swapId },
      include: { assignment: { select: { scheduleId: true, communityPastoralId: true } } },
    });
    if (!swap) throw new NotFoundException('Pedido de troca não encontrado');
    if (swap.status !== SwapStatus.PENDING) throw new BadRequestException('Pedido não está mais pendente');

    const member = await this.resolveMember(user.id);
    const isTarget = !!swap.targetId && !!member && swap.targetId === member.id;
    if (!isTarget && !(await this.canModerateAssignment(user, swap.assignment))) {
      throw new ForbiddenException(
        swap.targetId
          ? 'Somente o convidado ou a coordenação pode recusar este pedido'
          : 'Troca aberta: basta não assumir a escala. Somente a coordenação pode encerrar o pedido',
      );
    }

    const resolved = await this.closePending(swapId, SwapStatus.REJECTED);
    await this.auditService.log({
      actor: { id: user.id, email: user.email, role: user.role },
      action: 'UPDATE',
      entity: 'AssignmentSwapRequest',
      entityId: swapId,
      metadata: { rejected: true, byTarget: isTarget },
    });
    return resolved;
  }

  async cancel(swapId: string, user: CurrentUser) {
    const member = await this.resolveMember(user.id);
    const swap = await this.prisma.assignmentSwapRequest.findUnique({ where: { id: swapId } });
    if (!swap) throw new NotFoundException('Pedido de troca não encontrado');
    if (!member || swap.requesterId !== member.id) {
      throw new ForbiddenException('Só o solicitante pode cancelar');
    }
    if (swap.status !== SwapStatus.PENDING) throw new BadRequestException('Pedido não está mais pendente');
    return this.closePending(swapId, SwapStatus.CANCELLED);
  }
}
