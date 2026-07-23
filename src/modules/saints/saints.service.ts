import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';

/**
 * Santos — catálogo global + padroeiros.
 * Segue o padrão das pastorais: cadastro global (SYSTEM/DIOCESAN_ADMIN) e
 * vínculo de padroado por nível (diocese, paróquia ou comunidade), com o
 * vínculo validado pelo escopo de quem administra aquele nível.
 */
@Injectable()
export class SaintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  private canManageCatalog(role: UserRole) {
    return role === UserRole.SYSTEM_ADMIN || role === UserRole.DIOCESAN_ADMIN;
  }

  // ===== CATÁLOGO GLOBAL =====

  async create(
    dto: {
      name: string;
      feastMonth?: number;
      feastDay?: number;
      patronOf?: string;
      biography?: string;
      imageUrl?: string;
    },
    user: CurrentUser,
  ) {
    if (!this.canManageCatalog(user.role)) {
      throw new ForbiddenException('Somente a administração diocesana ou do sistema cadastra santos');
    }
    this.validateFeast(dto.feastMonth, dto.feastDay);

    const saint = await this.prisma.saint.create({
      data: {
        name: dto.name.trim(),
        feastMonth: dto.feastMonth ?? null,
        feastDay: dto.feastDay ?? null,
        patronOf: dto.patronOf?.trim() || null,
        biography: dto.biography ?? null,
        imageUrl: dto.imageUrl ?? null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'Saint', entityId: saint.id });
    return saint;
  }

  async update(
    id: string,
    dto: {
      name?: string;
      feastMonth?: number | null;
      feastDay?: number | null;
      patronOf?: string | null;
      biography?: string | null;
      imageUrl?: string | null;
    },
    user: CurrentUser,
  ) {
    if (!this.canManageCatalog(user.role)) {
      throw new ForbiddenException('Sem permissão para editar o catálogo de santos');
    }
    const saint = await this.prisma.saint.findFirst({ where: { id, deletedAt: null } });
    if (!saint) throw new NotFoundException('Santo não encontrado');
    if (dto.feastMonth !== undefined || dto.feastDay !== undefined) {
      this.validateFeast(dto.feastMonth ?? saint.feastMonth ?? undefined, dto.feastDay ?? saint.feastDay ?? undefined);
    }

    const updated = await this.prisma.saint.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        feastMonth: dto.feastMonth,
        feastDay: dto.feastDay,
        patronOf: dto.patronOf === undefined ? undefined : dto.patronOf?.trim() || null,
        biography: dto.biography,
        imageUrl: dto.imageUrl,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'Saint', entityId: id });
    return updated;
  }

  async remove(id: string, user: CurrentUser) {
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException('Somente o administrador do sistema remove santos do catálogo');
    }
    const saint = await this.prisma.saint.findFirst({ where: { id, deletedAt: null } });
    if (!saint) throw new NotFoundException('Santo não encontrado');

    const removed = await this.prisma.saint.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'DELETE', entity: 'Saint', entityId: id });
    return removed;
  }

  async list(filters: { search?: string; month?: number }) {
    const where: any = { deletedAt: null };
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.month) {
      where.feastMonth = filters.month;
    }
    return this.prisma.saint.findMany({
      where,
      include: { _count: { select: { patronages: true } } },
      orderBy: [{ feastMonth: 'asc' }, { feastDay: 'asc' }, { name: 'asc' }],
    });
  }

  async getWithPatronages(id: string) {
    const saint = await this.prisma.saint.findFirst({
      where: { id, deletedAt: null },
      include: {
        patronages: {
          include: {
            diocese: { select: { id: true, name: true } },
            parish: { select: { id: true, name: true } },
            community: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!saint) throw new NotFoundException('Santo não encontrado');
    return saint;
  }

  /** Santo(s) do dia — festa litúrgica de hoje (ou da data informada). */
  async ofTheDay(date?: string) {
    const ref = date ? new Date(date) : new Date();
    if (Number.isNaN(ref.getTime())) throw new BadRequestException('Data inválida');
    return this.prisma.saint.findMany({
      where: { deletedAt: null, feastMonth: ref.getMonth() + 1, feastDay: ref.getDate() },
      orderBy: { name: 'asc' },
    });
  }

  // ===== PADROADO (vínculo por nível) =====

  async addPatronage(
    saintId: string,
    dto: { dioceseId?: string; parishId?: string; communityId?: string; isPrimary?: boolean; notes?: string },
    user: CurrentUser,
  ) {
    const saint = await this.prisma.saint.findFirst({ where: { id: saintId, deletedAt: null } });
    if (!saint) throw new NotFoundException('Santo não encontrado');

    const targets = [dto.dioceseId, dto.parishId, dto.communityId].filter(Boolean);
    if (targets.length !== 1) {
      throw new BadRequestException('Informe exatamente um nível: dioceseId, parishId OU communityId');
    }

    await this.assertPatronageScope(dto, user);

    const patronage = await this.prisma.saintPatronage.create({
      data: {
        saintId,
        dioceseId: dto.dioceseId ?? null,
        parishId: dto.parishId ?? null,
        communityId: dto.communityId ?? null,
        isPrimary: dto.isPrimary ?? true,
        notes: dto.notes ?? null,
      },
      include: {
        saint: { select: { id: true, name: true } },
        diocese: { select: { id: true, name: true } },
        parish: { select: { id: true, name: true } },
        community: { select: { id: true, name: true } },
      },
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'CREATE',
      entity: 'SaintPatronage',
      entityId: patronage.id,
      metadata: { saintId, ...dto },
    });
    return patronage;
  }

  async removePatronage(patronageId: string, user: CurrentUser) {
    const patronage = await this.prisma.saintPatronage.findUnique({ where: { id: patronageId } });
    if (!patronage) throw new NotFoundException('Vínculo não encontrado');

    await this.assertPatronageScope(
      {
        dioceseId: patronage.dioceseId ?? undefined,
        parishId: patronage.parishId ?? undefined,
        communityId: patronage.communityId ?? undefined,
      },
      user,
    );

    await this.prisma.saintPatronage.delete({ where: { id: patronageId } });
    await this.auditService.log({ actor: this.auditActor(user), action: 'DELETE', entity: 'SaintPatronage', entityId: patronageId });
    return { deleted: true };
  }

  /**
   * Padroeiros de uma entidade específica (dioceseId/parishId/communityId) OU
   * de todo um nível (`level`) — este último para as listagens de cards
   * carregarem os padroeiros com uma única requisição.
   */
  async listByEntity(filters: {
    dioceseId?: string;
    parishId?: string;
    communityId?: string;
    level?: 'diocese' | 'parish' | 'community';
  }) {
    const targets = [filters.dioceseId, filters.parishId, filters.communityId, filters.level].filter(Boolean);
    if (targets.length !== 1) {
      throw new BadRequestException('Informe exatamente um: dioceseId, parishId, communityId OU level');
    }

    const where: any = { saint: { deletedAt: null } };
    if (filters.level === 'diocese') where.dioceseId = { not: null };
    else if (filters.level === 'parish') where.parishId = { not: null };
    else if (filters.level === 'community') where.communityId = { not: null };
    else {
      where.dioceseId = filters.dioceseId;
      where.parishId = filters.parishId;
      where.communityId = filters.communityId;
    }

    return this.prisma.saintPatronage.findMany({
      where,
      include: { saint: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // ===== HELPERS =====

  private validateFeast(month?: number, day?: number) {
    if (month !== undefined && month !== null && (month < 1 || month > 12)) {
      throw new BadRequestException('Mês da festa deve estar entre 1 e 12');
    }
    if (day !== undefined && day !== null && (day < 1 || day > 31)) {
      throw new BadRequestException('Dia da festa deve estar entre 1 e 31');
    }
  }

  /** Quem pode vincular padroeiro em cada nível. */
  private async assertPatronageScope(
    dto: { dioceseId?: string; parishId?: string; communityId?: string },
    user: CurrentUser,
  ) {
    if (user.role === UserRole.SYSTEM_ADMIN) return;

    if (dto.dioceseId) {
      if (user.role !== UserRole.DIOCESAN_ADMIN || user.dioceseId !== dto.dioceseId) {
        throw new ForbiddenException('Somente a administração da diocese vincula o padroeiro diocesano');
      }
      return;
    }

    if (dto.parishId) {
      const parish = await this.prisma.parish.findUnique({
        where: { id: dto.parishId },
        select: { id: true, dioceseId: true },
      });
      if (!parish) throw new NotFoundException('Paróquia não encontrada');
      const allowed =
        (user.role === UserRole.DIOCESAN_ADMIN && user.dioceseId === parish.dioceseId) ||
        (user.role === UserRole.PARISH_ADMIN && user.parishId === parish.id);
      if (!allowed) throw new ForbiddenException('Paróquia fora do seu escopo');
      return;
    }

    if (dto.communityId) {
      const manager =
        user.role === UserRole.DIOCESAN_ADMIN ||
        user.role === UserRole.PARISH_ADMIN ||
        user.role === UserRole.COMMUNITY_COORDINATOR;
      if (!manager) throw new ForbiddenException('Sem permissão para vincular padroeiro na comunidade');
      const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
      if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    }
  }
}
