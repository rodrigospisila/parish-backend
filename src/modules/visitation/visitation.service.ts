import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { VisitReason, VisitRequestStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import {
  SessionUser,
  communityScopeWhere,
  memberOfParishWhere,
  resolveCoordinatedPastoralIds,
} from '../pastorals/coordination-scope';
import { PlanAccessService } from '../plans/plan-access.service';
import { planMark } from '../../common/plan-list';

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
    // Plano por comunidade nas listas (M35). Opcional: specs montam sem ele
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  /** Coordenador da pastoral (do request) ou visitador designado numa das visitas. */
  private async canSeeNotes(user: SessionUser, request: { communityPastoralId: string | null; id: string }) {
    if (user.role === UserRole.SYSTEM_ADMIN) return true;

    // Coordenador ATUAL da pastoral de visitação — ser só membro dela
    // (pastoralIds = participação) não abre as anotações de saúde/luto
    if (request.communityPastoralId) {
      const coordinated = await resolveCoordinatedPastoralIds(this.prisma, user);
      if (coordinated.includes(request.communityPastoralId)) return true;
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
    // Ids do body: a pastoral precisa ser DESTA comunidade (o pedido entraria
    // na fila — e nas anotações — da coordenação de outra paróquia) e o
    // membro visitado, da comunidade ou do escopo do ator
    if (dto.communityPastoralId) {
      const pastoral = await this.prisma.communityPastoral.findFirst({
        where: { id: dto.communityPastoralId, deletedAt: null },
        select: { communityId: true },
      });
      if (!pastoral || pastoral.communityId !== dto.communityId) {
        throw new ForbiddenException('A pastoral informada não é desta comunidade');
      }
    }
    if (dto.memberId) {
      await this.assertVisitedMember(dto.memberId, dto.communityId, user);
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

  /**
   * Membro visitado: existe, não foi excluído e é da comunidade do pedido
   * (principal ou vínculo ATIVO) ou de outra comunidade do escopo do ator
   * (secretaria paroquial). O painel escolhe o membro na lista geral do
   * escopo, por isso a segunda via.
   */
  private async assertVisitedMember(memberId: string, communityId: string, user: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, communityId: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.communityId === communityId) return;
    const link = await this.prisma.memberCommunity.findFirst({
      where: { memberId, communityId, isActive: true },
      select: { id: true },
    });
    if (link) return;
    if (member.communityId && (await this.hierarchyService.isCommunityInScope(user, member.communityId))) return;
    throw new ForbiddenException('Membro fora do seu escopo');
  }

  /** Lista pedidos SEM as anotações sensíveis (apenas dados operacionais). */
  async listRequests(user: SessionUser, status?: VisitRequestStatus) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (user.role === UserRole.PASTORAL_COORDINATOR) {
      // Coordenador de pastoral vê apenas os pedidos da(s) pastoral(is) que
      // COORDENA; sem coordenação vigente, nada (o motivo é dado sensível)
      const coordinated = await resolveCoordinatedPastoralIds(this.prisma, user);
      if (!coordinated.length) return [];
      where.communityPastoralId = { in: coordinated };
    } else {
      // Escopo hierárquico com ramo de diocese; sem escopo resolvido
      // (ex.: diocesano sem diocese, coordenador sem comunidade) → vazio
      const scope = communityScopeWhere(user);
      if (!scope) return [];
      if (Object.keys(scope).length) where.community = scope;
    }
    const requests = await this.prisma.visitRequest.findMany({
      where,
      select: {
        id: true,
        personName: true,
        memberId: true,
        reason: true,
        status: true,
        communityId: true,
        communityPastoralId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Pedido de comunidade sem o plano vem com o cadeado (M35)
    return planMark(this.planAccess, user, requests, (request) => request.communityId);
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

    // Visitador designado passa a ver as anotações (canSeeNotes): só membros
    // da paróquia do pedido — id de fora (ou inexistente) é recusado
    const visitorMemberIds = [...new Set((dto.visitorMemberIds ?? []).filter((id) => typeof id === 'string' && id))];
    if (visitorMemberIds.length) {
      const community = await this.prisma.community.findUnique({
        where: { id: request.communityId },
        select: { parishId: true },
      });
      const valid = community?.parishId
        ? await this.prisma.member.count({ where: memberOfParishWhere(visitorMemberIds, community.parishId) })
        : 0;
      if (valid !== visitorMemberIds.length) {
        throw new ForbiddenException('Visitador fora da paróquia do pedido');
      }
    }

    const visit = await this.prisma.visit.create({
      data: {
        visitRequestId: requestId,
        date: new Date(dto.date),
        visitorMemberIds: visitorMemberIds.length ? visitorMemberIds.join(',') : null,
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
