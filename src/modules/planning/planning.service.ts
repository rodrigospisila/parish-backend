import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ActionStatus, PlanStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

/**
 * Planejamento pastoral (roadmap 3.2).
 * Objetivos → metas → ações. Atividades (Event) podem ser vinculadas a objetivos,
 * o elo que tira o sistema da condição de "apenas agenda de tarefas".
 */
@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManagePlan(role: UserRole) {
    return role !== UserRole.VOLUNTEER && role !== UserRole.FAITHFUL;
  }

  async createPlan(dto: { title: string; year: number; communityId?: string }, user: CurrentUser) {
    if (!this.canManagePlan(user.role)) {
      throw new ForbiddenException('Você não tem permissão para criar planos pastorais');
    }
    if (!user.parishId && user.role !== UserRole.SYSTEM_ADMIN) {
      throw new BadRequestException('Usuário sem paróquia vinculada');
    }
    if (dto.communityId) {
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    }

    const parishId = user.parishId!;
    const plan = await this.prisma.pastoralPlan.create({
      data: { title: dto.title, year: dto.year, parishId, communityId: dto.communityId ?? null },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'PastoralPlan', entityId: plan.id });
    return plan;
  }

  async listPlans(user: CurrentUser) {
    const where: any = { deletedAt: null };
    if (user.role !== UserRole.SYSTEM_ADMIN && user.parishId) {
      where.parishId = user.parishId;
    }
    return this.prisma.pastoralPlan.findMany({
      where,
      include: { _count: { select: { objectives: true } } },
      orderBy: { year: 'desc' },
    });
  }

  private async loadPlanInScope(planId: string, user: CurrentUser) {
    const plan = await this.prisma.pastoralPlan.findFirst({ where: { id: planId, deletedAt: null } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    if (user.role !== UserRole.SYSTEM_ADMIN && plan.parishId !== user.parishId) {
      throw new ForbiddenException('Plano fora do seu escopo');
    }
    return plan;
  }

  async getPlan(planId: string, user: CurrentUser) {
    await this.loadPlanInScope(planId, user);
    return this.prisma.pastoralPlan.findUnique({
      where: { id: planId },
      include: {
        objectives: {
          include: {
            goals: true,
            actions: {
              include: { responsibleMember: { select: { id: true, fullName: true } } },
            },
            _count: { select: { events: true } },
          },
        },
      },
    });
  }

  async updatePlanStatus(planId: string, status: PlanStatus, user: CurrentUser) {
    await this.loadPlanInScope(planId, user);
    return this.prisma.pastoralPlan.update({ where: { id: planId }, data: { status } });
  }

  async addObjective(planId: string, description: string, user: CurrentUser) {
    await this.loadPlanInScope(planId, user);
    const objective = await this.prisma.pastoralObjective.create({ data: { planId, description } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'PastoralObjective', entityId: objective.id });
    return objective;
  }

  private async loadObjectiveInScope(objectiveId: string, user: CurrentUser) {
    const objective = await this.prisma.pastoralObjective.findUnique({
      where: { id: objectiveId },
      include: { plan: true },
    });
    if (!objective) throw new NotFoundException('Objetivo não encontrado');
    if (user.role !== UserRole.SYSTEM_ADMIN && objective.plan.parishId !== user.parishId) {
      throw new ForbiddenException('Objetivo fora do seu escopo');
    }
    return objective;
  }

  async addGoal(
    objectiveId: string,
    dto: { description: string; indicator?: string; targetValue?: string },
    user: CurrentUser,
  ) {
    await this.loadObjectiveInScope(objectiveId, user);
    return this.prisma.pastoralGoal.create({
      data: {
        objectiveId,
        description: dto.description,
        indicator: dto.indicator ?? null,
        targetValue: dto.targetValue ?? null,
      },
    });
  }

  async updateGoalProgress(goalId: string, currentValue: string, user: CurrentUser) {
    const goal = await this.prisma.pastoralGoal.findUnique({
      where: { id: goalId },
      include: { objective: { include: { plan: true } } },
    });
    if (!goal) throw new NotFoundException('Meta não encontrada');
    if (user.role !== UserRole.SYSTEM_ADMIN && goal.objective.plan.parishId !== user.parishId) {
      throw new ForbiddenException('Meta fora do seu escopo');
    }
    return this.prisma.pastoralGoal.update({ where: { id: goalId }, data: { currentValue } });
  }

  async addAction(
    objectiveId: string,
    dto: { title: string; dueDate?: string; responsibleMemberId?: string },
    user: CurrentUser,
  ) {
    await this.loadObjectiveInScope(objectiveId, user);
    const action = await this.prisma.pastoralAction.create({
      data: {
        objectiveId,
        title: dto.title,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        responsibleMemberId: dto.responsibleMemberId ?? null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'PastoralAction', entityId: action.id });
    return action;
  }

  private async loadActionInScope(actionId: string, user: CurrentUser) {
    const action = await this.prisma.pastoralAction.findUnique({
      where: { id: actionId },
      include: { objective: { include: { plan: true } } },
    });
    if (!action) throw new NotFoundException('Ação não encontrada');
    if (user.role !== UserRole.SYSTEM_ADMIN && action.objective.plan.parishId !== user.parishId) {
      throw new ForbiddenException('Ação fora do seu escopo');
    }
    return action;
  }

  async updateAction(
    actionId: string,
    dto: { status?: ActionStatus; resultNotes?: string; dueDate?: string; title?: string },
    user: CurrentUser,
  ) {
    await this.loadActionInScope(actionId, user);
    const updated = await this.prisma.pastoralAction.update({
      where: { id: actionId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.resultNotes !== undefined ? { resultNotes: dto.resultNotes } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
      },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'PastoralAction',
      entityId: actionId,
      metadata: { status: dto.status, hasResults: dto.resultNotes !== undefined },
    });
    return updated;
  }

  /** Vincula (ou desvincula) uma atividade/evento a um objetivo pastoral. */
  async linkEventToObjective(eventId: string, objectiveId: string | null, user: CurrentUser) {
    const event = await this.prisma.event.findFirst({ where: { id: eventId, deletedAt: null } });
    if (!event) throw new NotFoundException('Evento não encontrado');

    const canManage = await this.hierarchyService.canManageEvent(user.id, eventId);
    if (!canManage) throw new ForbiddenException('Você não pode alterar este evento');

    if (objectiveId) {
      await this.loadObjectiveInScope(objectiveId, user);
    }

    return this.prisma.event.update({ where: { id: eventId }, data: { objectiveId } });
  }
}
