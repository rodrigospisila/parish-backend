import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VisitReason, VisitRequestStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

/**
 * Pastoral da Visitação / Enfermos (roadmap 4.5).
 *
 * PRIVACIDADE RÍGIDA: o motivo (saúde/luto) é dado SENSÍVEL (LGPD). As anotações
 * pastorais de uma visita só são visíveis ao coordenador da pastoral de visitação
 * e aos visitadores designados — nem PARISH_ADMIN por padrão. Exige consentimento
 * explícito do visitado/família. Não registrar conteúdo íntimo/confissão.
 */
@Injectable()
export class VisitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  /** Coordenador da pastoral (do request) ou visitador designado numa das visitas. */
  private async canSeeNotes(user: CurrentUser, request: { communityPastoralId: string | null; id: string }) {
    if (user.role === UserRole.SYSTEM_ADMIN) return true;

    // Coordenador atual da pastoral de visitação
    if (request.communityPastoralId) {
      const isCoordinator = user.pastoralIds?.includes(request.communityPastoralId);
      if (isCoordinator) return true;
    }

    // Visitador designado em alguma visita deste pedido (member vinculado ao user)
    const member = await this.prisma.member.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (member) {
      const visits = await this.prisma.visit.findMany({
        where: { visitRequestId: request.id },
        select: { visitorMemberIds: true },
      });
      const isVisitor = visits.some((v) => (v.visitorMemberIds ?? '').split(',').includes(member.id));
      if (isVisitor) return true;
    }
    return false;
  }

  async createRequest(
    dto: {
      communityId: string;
      communityPastoralId?: string;
      memberId?: string;
      personName?: string;
      address?: string;
      contactPhone?: string;
      reason: VisitReason;
      consentGiven: boolean;
    },
    user: CurrentUser,
  ) {
    const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    if (!dto.memberId && !dto.personName) {
      throw new BadRequestException('Informe o membro ou o nome da pessoa a visitar');
    }
    if (!dto.consentGiven) {
      throw new BadRequestException('Consentimento explícito do visitado/família é obrigatório');
    }

    const request = await this.prisma.visitRequest.create({
      data: {
        communityId: dto.communityId,
        communityPastoralId: dto.communityPastoralId ?? null,
        memberId: dto.memberId ?? null,
        personName: dto.personName ?? null,
        address: dto.address ?? null,
        contactPhone: dto.contactPhone ?? null,
        reason: dto.reason,
        consentGiven: dto.consentGiven,
        requesterUserId: user.id,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'VisitRequest', entityId: request.id, metadata: { reason: dto.reason } });
    return request;
  }

  /** Lista pedidos SEM as anotações sensíveis (apenas dados operacionais). */
  async listRequests(user: CurrentUser, status?: VisitRequestStatus) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) where.communityId = user.communityId;
      else if (user.parishId) where.community = { parishId: user.parishId };
    }
    // Coordenador de pastoral vê apenas os pedidos da(s) sua(s) pastoral(is)
    if (user.role === UserRole.PASTORAL_COORDINATOR && user.pastoralIds?.length) {
      where.communityPastoralId = { in: user.pastoralIds };
    }
    return this.prisma.visitRequest.findMany({
      where,
      select: {
        id: true,
        personName: true,
        memberId: true,
        reason: true,
        status: true,
        communityPastoralId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async loadRequest(id: string, user: CurrentUser) {
    const request = await this.prisma.visitRequest.findFirst({ where: { id, deletedAt: null } });
    if (!request) throw new NotFoundException('Pedido de visita não encontrado');
    const inScope = await this.hierarchyService.isCommunityInScope(user, request.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    return request;
  }

  async registerVisit(
    requestId: string,
    dto: { date: string; visitorMemberIds?: string[]; notes?: string },
    user: CurrentUser,
  ) {
    const request = await this.loadRequest(requestId, user);
    // Só coordenador da pastoral/visitador pode registrar (e ver) anotações
    const allowed = await this.canSeeNotes(user, request);
    if (!allowed) {
      throw new ForbiddenException('Apenas o coordenador da pastoral ou os visitadores podem registrar visitas');
    }

    const visit = await this.prisma.visit.create({
      data: {
        visitRequestId: requestId,
        date: new Date(dto.date),
        visitorMemberIds: dto.visitorMemberIds?.length ? dto.visitorMemberIds.join(',') : null,
        notes: dto.notes ?? null,
        createdByUserId: user.id,
      },
    });
    await this.prisma.visitRequest.update({ where: { id: requestId }, data: { status: VisitRequestStatus.DONE } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'Visit', entityId: visit.id });
    return visit;
  }

  /** Detalhe COM anotações — apenas quem tem direito de ver. */
  async getRequestWithVisits(id: string, user: CurrentUser) {
    const request = await this.loadRequest(id, user);
    const canSee = await this.canSeeNotes(user, request);
    if (!canSee) {
      throw new ForbiddenException('Anotações da visita são restritas ao coordenador da pastoral e aos visitadores');
    }
    await this.auditService.log({ actor: this.auditActor(user), action: 'READ_SENSITIVE', entity: 'VisitRequest', entityId: id });
    return this.prisma.visitRequest.findUnique({
      where: { id },
      include: { visits: { orderBy: { date: 'desc' } } },
    });
  }
}
