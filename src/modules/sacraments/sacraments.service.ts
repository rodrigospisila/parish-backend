import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { CreateSacramentDto } from './dto/create-sacrament.dto';
import { UpdateSacramentDto } from './dto/update-sacrament.dto';

/**
 * Histórico sacramental do membro (roadmap 2.1).
 *
 * IMPORTANTE: este é o registro de ACOMPANHAMENTO PASTORAL. O registro
 * sacramental OFICIAL (livro/folha/termo, certidões) pertence à secretaria
 * paroquial e é tratado na Fase 4 (item 4.4 — Preparação de Sacramentos).
 */
@Injectable()
export class SacramentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
  ) {}

  private auditActor(user?: CurrentUser) {
    return user ? { id: user.id, email: user.email, role: user.role } : null;
  }

  /** O membro precisa existir, não estar excluído e estar no escopo do usuário. */
  private async assertMemberScope(memberId: string, currentUser: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, userId: true },
    });

    if (!member) {
      throw new NotFoundException('Membro não encontrado');
    }

    const isSelf = !!member.userId && member.userId === currentUser.id;
    if (isSelf || currentUser.role === UserRole.SYSTEM_ADMIN) {
      return member;
    }

    const canManage = await this.hierarchyService.canManageMember(currentUser.id, memberId);
    if (!canManage) {
      throw new ForbiddenException('Você não tem permissão para acessar os sacramentos deste membro');
    }
    return member;
  }

  async create(dto: CreateSacramentDto, currentUser: CurrentUser) {
    await this.assertMemberScope(dto.memberId, currentUser);

    const sacrament = await this.prisma.sacrament.create({
      data: {
        memberId: dto.memberId,
        type: dto.type,
        date: new Date(dto.date),
        place: dto.place ?? null,
        minister: dto.minister ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'CREATE',
      entity: 'Sacrament',
      entityId: sacrament.id,
      metadata: { memberId: dto.memberId, type: dto.type },
    });

    return sacrament;
  }

  async findByMember(memberId: string, currentUser: CurrentUser) {
    await this.assertMemberScope(memberId, currentUser);

    return this.prisma.sacrament.findMany({
      where: { memberId },
      orderBy: { date: 'asc' },
    });
  }

  private async loadSacramentOrThrow(id: string) {
    const sacrament = await this.prisma.sacrament.findUnique({ where: { id } });
    if (!sacrament) {
      throw new NotFoundException('Sacramento não encontrado');
    }
    return sacrament;
  }

  async update(id: string, dto: UpdateSacramentDto, currentUser: CurrentUser) {
    const sacrament = await this.loadSacramentOrThrow(id);
    await this.assertMemberScope(sacrament.memberId, currentUser);

    const updated = await this.prisma.sacrament.update({
      where: { id },
      data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.place !== undefined ? { place: dto.place } : {}),
        ...(dto.minister !== undefined ? { minister: dto.minister } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'UPDATE',
      entity: 'Sacrament',
      entityId: id,
      metadata: { memberId: sacrament.memberId, changedFields: Object.keys(dto) },
    });

    return updated;
  }

  async remove(id: string, currentUser: CurrentUser) {
    const sacrament = await this.loadSacramentOrThrow(id);
    await this.assertMemberScope(sacrament.memberId, currentUser);

    await this.prisma.sacrament.delete({ where: { id } });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'DELETE',
      entity: 'Sacrament',
      entityId: id,
      metadata: { memberId: sacrament.memberId, type: sacrament.type },
    });

    return { message: 'Sacramento removido' };
  }
}
