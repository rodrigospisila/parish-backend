import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SacramentProcessStatus, SacramentType, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';

/**
 * Preparação de sacramentos (roadmap 4.4). Processo com etapas, checklist de
 * documentos, curso (reusa Event FORMATION) e, na celebração, gera o `Sacrament`
 * definitivo + certidão em PDF com numeração livro/folha/termo.
 *
 * Distinção: aqui é o REGISTRO OFICIAL (secretaria). O acompanhamento pastoral
 * simples fica no módulo de sacramentos (histórico) da Fase 2.
 */
@Injectable()
export class SacramentProcessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly pdfService: PdfService,
  ) {}

  private canManage(role: UserRole) {
    return role !== UserRole.VOLUNTEER && role !== UserRole.FAITHFUL;
  }

  private auditActor(user: CurrentUser) {
    return { id: user.id, email: user.email, role: user.role };
  }

  async create(
    dto: {
      type: SacramentType;
      memberId: string;
      communityId: string;
      involved?: unknown;
      documentsChecklist?: unknown;
      scheduledDate?: string;
      celebrant?: string;
    },
    user: CurrentUser,
  ) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');

    const process = await this.prisma.sacramentProcess.create({
      data: {
        type: dto.type,
        memberId: dto.memberId,
        communityId: dto.communityId,
        involved: (dto.involved as Prisma.InputJsonValue) ?? undefined,
        documentsChecklist: (dto.documentsChecklist as Prisma.InputJsonValue) ?? undefined,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        celebrant: dto.celebrant ?? null,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'SacramentProcess', entityId: process.id });
    return process;
  }

  async list(user: CurrentUser, status?: SacramentProcessStatus) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (user.role !== UserRole.SYSTEM_ADMIN) {
      if (user.communityId) where.communityId = user.communityId;
      else if (user.parishId) where.community = { parishId: user.parishId };
    }
    return this.prisma.sacramentProcess.findMany({
      where,
      include: { member: { select: { id: true, fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async loadInScope(id: string, user: CurrentUser) {
    const process = await this.prisma.sacramentProcess.findFirst({ where: { id, deletedAt: null } });
    if (!process) throw new NotFoundException('Processo não encontrado');
    const inScope = await this.hierarchyService.isCommunityInScope(user, process.communityId);
    if (!inScope) throw new ForbiddenException('Processo fora do seu escopo');
    return process;
  }

  async updateStatus(id: string, status: SacramentProcessStatus, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    await this.loadInScope(id, user);
    return this.prisma.sacramentProcess.update({ where: { id }, data: { status } });
  }

  async updateChecklist(id: string, documentsChecklist: unknown, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    await this.loadInScope(id, user);
    return this.prisma.sacramentProcess.update({
      where: { id },
      data: { documentsChecklist: (documentsChecklist as Prisma.InputJsonValue) ?? undefined },
    });
  }

  /** Celebra: cria o Sacrament definitivo + numeração e conclui o processo. */
  async celebrate(
    id: string,
    dto: { date?: string; minister?: string; book?: string; page?: string; term?: string; place?: string },
    user: CurrentUser,
  ) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    const process = await this.loadInScope(id, user);
    if (process.status === SacramentProcessStatus.CELEBRATED) {
      throw new BadRequestException('Processo já celebrado');
    }

    const date = dto.date ? new Date(dto.date) : new Date();
    const result = await this.prisma.$transaction(async (prisma) => {
      const sacrament = await prisma.sacrament.create({
        data: {
          memberId: process.memberId,
          type: process.type,
          date,
          place: dto.place ?? null,
          minister: dto.minister ?? process.celebrant ?? null,
          book: dto.book ?? null,
          page: dto.page ?? null,
          term: dto.term ?? null,
        },
      });
      const updated = await prisma.sacramentProcess.update({
        where: { id },
        data: {
          status: SacramentProcessStatus.CELEBRATED,
          sacramentId: sacrament.id,
          book: dto.book ?? null,
          page: dto.page ?? null,
          term: dto.term ?? null,
        },
      });
      return { sacrament, updated };
    });

    await this.auditService.log({ actor: this.auditActor(user), action: 'UPDATE', entity: 'SacramentProcess', entityId: id, metadata: { celebrated: true, sacramentId: result.sacrament.id } });
    return result.updated;
  }

  /** Certidão em PDF (também 2ª via). */
  async certificate(id: string, user: CurrentUser): Promise<Buffer> {
    const process = await this.prisma.sacramentProcess.findFirst({
      where: { id, deletedAt: null },
      include: {
        member: { select: { fullName: true } },
        community: { select: { name: true, parish: { select: { name: true } } } },
      },
    });
    if (!process) throw new NotFoundException('Processo não encontrado');
    const inScope = await this.hierarchyService.isCommunityInScope(user, process.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    if (process.status !== SacramentProcessStatus.CELEBRATED) {
      throw new BadRequestException('Certidão disponível apenas após a celebração');
    }

    const typeLabels: Record<string, string> = {
      BAPTISM: 'Batismo',
      FIRST_COMMUNION: 'Primeira Eucaristia',
      CONFIRMATION: 'Crisma',
      MARRIAGE: 'Matrimônio',
      HOLY_ORDERS: 'Ordem',
      ANOINTING_OF_THE_SICK: 'Unção dos Enfermos',
    };

    await this.auditService.log({ actor: this.auditActor(user), action: 'EXPORT', entity: 'SacramentProcess', entityId: id, metadata: { certificate: true } });

    return this.pdfService.renderTableDocument({
      title: `Certidão de ${typeLabels[process.type] ?? process.type}`,
      subtitle: `${process.community.parish.name} — ${process.community.name}`,
      sections: [
        {
          columns: ['Campo', 'Valor'],
          widths: [1, 2],
          rows: [
            ['Nome', process.member.fullName],
            ['Livro', process.book || '-'],
            ['Folha', process.page || '-'],
            ['Termo', process.term || '-'],
            ['Data', process.scheduledDate ? process.scheduledDate.toLocaleDateString('pt-BR') : '-'],
            ['Celebrante', process.celebrant || '-'],
          ],
        },
      ],
      footer: `Emitido em ${new Date().toLocaleString('pt-BR')}`,
    });
  }
}
