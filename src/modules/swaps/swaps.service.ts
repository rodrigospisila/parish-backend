import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { SwapStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleConflictsService } from '../../common/schedule-conflicts.service';

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
  ) {}

  private async resolveMember(userId: string) {
    return this.prisma.member.findFirst({ where: { userId }, select: { id: true } });
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
          schedule: { select: { id: true, title: true, date: true } },
        },
      },
    };
    const linkedCommunityIds = await this.memberCommunityIds(member.id);
    const [requested, invited] = await Promise.all([
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

  async reject(swapId: string, user: CurrentUser) {
    const member = await this.resolveMember(user.id);
    const swap = await this.prisma.assignmentSwapRequest.findUnique({ where: { id: swapId } });
    if (!swap) throw new NotFoundException('Pedido de troca não encontrado');
    if (swap.targetId && swap.targetId !== member?.id) {
      throw new ForbiddenException('Sem permissão');
    }
    return this.prisma.assignmentSwapRequest.update({
      where: { id: swapId },
      data: { status: SwapStatus.REJECTED, resolvedAt: new Date() },
    });
  }

  async cancel(swapId: string, user: CurrentUser) {
    const member = await this.resolveMember(user.id);
    const swap = await this.prisma.assignmentSwapRequest.findUnique({ where: { id: swapId } });
    if (!swap) throw new NotFoundException('Pedido de troca não encontrado');
    if (swap.requesterId !== member?.id) throw new ForbiddenException('Só o solicitante pode cancelar');
    return this.prisma.assignmentSwapRequest.update({
      where: { id: swapId },
      data: { status: SwapStatus.CANCELLED, resolvedAt: new Date() },
    });
  }
}
