import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PastoralsService } from './pastorals.service';

/**
 * "Quero participar" (Onda 4): o fiel pede para entrar numa pastoral da
 * comunidade; a coordenação da pastoral (ou da comunidade) aprova/recusa.
 * Espelha o fluxo de inscrição online da catequese.
 */
@Injectable()
export class JoinRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly pastoralsService: PastoralsService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private async resolveMember(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, fullName: true, communityId: true, status: true },
    });
    if (!member) {
      throw new BadRequestException('Seu usuário ainda não tem cadastro de membro — procure a secretaria');
    }
    if (member.status !== 'ACTIVE') {
      throw new BadRequestException('Somente membros ativos podem pedir participação');
    }
    return member;
  }

  /** Coordenação que recebe o pedido: coordenadores atuais da pastoral; sem eles, a coordenação da comunidade. */
  private async responsibleUserIds(communityPastoralId: string, communityId: string): Promise<string[]> {
    const coordinators = await this.prisma.pastoralCoordinator.findMany({
      where: { communityPastoralId, isCurrent: true },
      include: { member: { select: { userId: true } } },
    });
    const ids = coordinators.map((c) => c.member.userId).filter((id): id is string => !!id);
    if (ids.length) return [...new Set(ids)];
    const communityCoordinators = await this.prisma.user.findMany({
      where: { communityId, role: 'COMMUNITY_COORDINATOR', isActive: true },
      select: { id: true },
    });
    return communityCoordinators.map((u) => u.id);
  }

  /** Fiel pede para participar. Reenviar após recusa reabre o mesmo pedido. */
  async requestJoin(communityPastoralId: string, user: CurrentUser, rawMessage?: string) {
    const member = await this.resolveMember(user);
    const pastoral = await this.prisma.communityPastoral.findFirst({
      where: { id: communityPastoralId, deletedAt: null },
      include: { globalPastoral: { select: { name: true } }, community: { select: { id: true, name: true } } },
    });
    if (!pastoral || pastoral.status !== 'ACTIVE') {
      throw new NotFoundException('Pastoral não encontrada');
    }

    // Mesma regra do vínculo manual: membro da comunidade ou com vínculo secundário ativo
    if (pastoral.communityId !== member.communityId) {
      const link = await this.prisma.memberCommunity.findFirst({
        where: { memberId: member.id, communityId: pastoral.communityId, isActive: true },
        select: { id: true },
      });
      if (!link) {
        throw new BadRequestException('Vincule-se a esta comunidade para pedir participação na pastoral');
      }
    }

    const membership = await this.prisma.pastoralMember.findFirst({
      where: { memberId: member.id, communityPastoralId, isActive: true },
      select: { id: true },
    });
    if (membership) {
      throw new BadRequestException('Você já faz parte desta pastoral');
    }

    const message = (rawMessage ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300) || null;
    const existing = await this.prisma.pastoralJoinRequest.findUnique({
      where: { communityPastoralId_memberId: { communityPastoralId, memberId: member.id } },
    });
    if (existing?.status === 'PENDING') {
      throw new BadRequestException('Pedido já enviado — aguarde a resposta da coordenação');
    }

    const request = await this.prisma.pastoralJoinRequest.upsert({
      where: { communityPastoralId_memberId: { communityPastoralId, memberId: member.id } },
      create: { communityPastoralId, memberId: member.id, message },
      update: { status: 'PENDING', message, rejectionReason: null, reviewedByUserId: null, reviewedAt: null },
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: existing ? 'UPDATE' : 'CREATE',
      entity: 'PastoralJoinRequest',
      entityId: request.id,
      metadata: { communityPastoralId, memberId: member.id, reapplied: !!existing },
    });

    // Aviso à coordenação é conveniência — não derruba o pedido
    try {
      const recipients = await this.responsibleUserIds(communityPastoralId, pastoral.communityId);
      if (recipients.length) {
        await this.notificationsService.notifyUsers(
          recipients,
          NotificationType.PASTORAL_JOIN_REQUEST,
          `Quero participar — ${pastoral.globalPastoral.name}`,
          `${member.fullName} pediu para entrar na pastoral${message ? `: “${message}”` : '.'}`,
          { kind: 'join-request', communityPastoralId, joinRequestId: request.id },
        );
      }
    } catch {
      // sem push, o pedido continua visível na tela da pastoral
    }

    return request;
  }

  /** Pedidos de uma pastoral (coordenação). status: PENDING (default) | ALL */
  async listForPastoral(communityPastoralId: string, user: CurrentUser, status?: string) {
    await this.pastoralsService.ensurePastoralAccess(communityPastoralId, user);
    // Membro eliminado (LGPD) não aparece — nem seus dados de contato
    const where: any = { communityPastoralId, member: { deletedAt: null } };
    if (status !== 'ALL') where.status = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status) ? status : 'PENDING';
    return this.prisma.pastoralJoinRequest.findMany({
      where,
      include: { member: { select: { id: true, fullName: true, phone: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Aprova (cria/reativa o vínculo) ou recusa (com motivo opcional). */
  async review(requestId: string, approve: boolean, user: CurrentUser, rawReason?: string) {
    const request = await this.prisma.pastoralJoinRequest.findUnique({
      where: { id: requestId },
      include: {
        member: { select: { id: true, fullName: true, userId: true } },
        communityPastoral: { include: { globalPastoral: { select: { name: true } } } },
      },
    });
    if (!request) throw new NotFoundException('Pedido não encontrado');
    await this.pastoralsService.ensurePastoralAccess(request.communityPastoralId, user);
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Este pedido já foi respondido');
    }

    const reason = (rawReason ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300) || null;
    if (approve) {
      // Revalida o que o pedido exigiu: membro vivo/ativo e ainda vinculado à
      // comunidade da pastoral (o vínculo pode ter sido revogado no meio-tempo)
      const member = await this.prisma.member.findFirst({
        where: { id: request.memberId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, communityId: true },
      });
      const pastoralCommunityId = request.communityPastoral.communityId;
      const stillLinked =
        !!member &&
        (member.communityId === pastoralCommunityId ||
          !!(await this.prisma.memberCommunity.findFirst({
            where: { memberId: member.id, communityId: pastoralCommunityId, isActive: true },
            select: { id: true },
          })));
      if (!stillLinked) {
        await this.prisma.pastoralJoinRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            rejectionReason: 'Cadastro inativo ou sem vínculo com a comunidade',
            reviewedByUserId: user.id,
            reviewedAt: new Date(),
          },
        });
        throw new BadRequestException('O membro não está mais ativo nesta comunidade — pedido encerrado');
      }
      // Reingresso via "quero participar" é SEMPRE como membro comum: um vínculo
      // inativo antigo com papel de coordenação não volta com esse papel
      await this.prisma.pastoralMember.upsert({
        where: {
          memberId_communityPastoralId: { memberId: request.memberId, communityPastoralId: request.communityPastoralId },
        },
        create: { memberId: request.memberId, communityPastoralId: request.communityPastoralId, role: 'Membro', isActive: true },
        update: { isActive: true, leftAt: null, role: 'Membro', joinedAt: new Date() },
      });
    }

    const updated = await this.prisma.pastoralJoinRequest.update({
      where: { id: requestId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        rejectionReason: approve ? null : reason,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });

    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'PastoralJoinRequest',
      entityId: requestId,
      before: { status: 'PENDING' },
      after: { status: updated.status, rejectionReason: updated.rejectionReason },
      metadata: { memberId: request.memberId, communityPastoralId: request.communityPastoralId },
    });

    if (request.member.userId) {
      try {
        const pastoralName = request.communityPastoral.globalPastoral.name;
        await this.notificationsService.notifyUsers(
          [request.member.userId],
          NotificationType.PASTORAL_JOIN_REQUEST,
          approve ? `Bem-vindo(a) à ${pastoralName} 🙌` : `Pedido de participação — ${pastoralName}`,
          approve
            ? 'Seu pedido foi aprovado — a pastoral já aparece nas suas escalas e avisos.'
            : `A coordenação não pôde aprovar agora${reason ? `: ${reason}` : '.'}`,
          { kind: 'join-request-reviewed', communityPastoralId: request.communityPastoralId, approved: approve },
        );
      } catch {
        // best-effort
      }
    }

    return updated;
  }

  /** Meus pedidos + pastorais das quais já faço parte (para o app decidir o botão). */
  async mine(user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { userId: user.id, deletedAt: null },
      select: { id: true },
    });
    if (!member) return { requests: [], memberOfPastoralIds: [] };
    const [requests, memberships] = await Promise.all([
      this.prisma.pastoralJoinRequest.findMany({
        where: { memberId: member.id },
        include: { communityPastoral: { include: { globalPastoral: { select: { name: true } } } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.pastoralMember.findMany({
        where: { memberId: member.id, isActive: true, communityPastoralId: { not: null } },
        select: { communityPastoralId: true },
      }),
    ]);
    return {
      requests: requests.map((r) => ({
        id: r.id,
        communityPastoralId: r.communityPastoralId,
        pastoralName: r.communityPastoral.globalPastoral.name,
        status: r.status,
        message: r.message,
        rejectionReason: r.rejectionReason,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
      })),
      memberOfPastoralIds: memberships.map((m) => m.communityPastoralId).filter((id): id is string => !!id),
    };
  }
}
