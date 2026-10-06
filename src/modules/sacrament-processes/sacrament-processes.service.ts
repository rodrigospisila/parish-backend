import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { SacramentProcessStatus, SacramentType, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PdfService } from '../pdf/pdf.service';
import { communityScopeWhere } from '../pastorals/coordination-scope';
import { formatCivilDate, parseCivilDate } from '../catechesis/civil-date';

/** Status que o PATCH :id/status aceita — CELEBRATED só pela celebração. */
const MANUAL_STATUSES: SacramentProcessStatus[] = [
  SacramentProcessStatus.REQUESTED,
  SacramentProcessStatus.DOCUMENTS,
  SacramentProcessStatus.COURSE,
  SacramentProcessStatus.SCHEDULED,
  SacramentProcessStatus.CANCELLED,
];

/** Sacramentos que imprimem caráter (não se repetem): a celebração recusa duplicado. */
const UNREPEATABLE_SACRAMENTS: SacramentType[] = [
  SacramentType.BAPTISM,
  SacramentType.CONFIRMATION,
  SacramentType.HOLY_ORDERS,
];

const SACRAMENT_LABELS: Record<string, string> = {
  BAPTISM: 'Batismo',
  FIRST_COMMUNION: 'Primeira Eucaristia',
  CONFIRMATION: 'Crisma',
  MARRIAGE: 'Matrimônio',
  HOLY_ORDERS: 'Ordem',
  ANOINTING_OF_THE_SICK: 'Unção dos Enfermos',
};

/** Texto livre curto (celebrante, local, livro/folha/termo): string ou nada. */
function optionalText(raw: unknown, label: string, max = 120): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') throw new BadRequestException(`${label} inválido — informe um texto`);
  const clean = raw.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return clean || null;
}

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
    // Enum e data validados aqui: antes viravam 500 (Prisma/Invalid Date)
    if (!dto.type || !Object.values(SacramentType).includes(dto.type)) {
      throw new BadRequestException('Tipo de sacramento inválido');
    }
    if (!dto.communityId || typeof dto.communityId !== 'string') {
      throw new BadRequestException('Informe a comunidade');
    }
    const scheduledDate =
      dto.scheduledDate === undefined || dto.scheduledDate === null || dto.scheduledDate === ''
        ? null
        : parseCivilDate(dto.scheduledDate, 'Data agendada', { allowFuture: true });
    const celebrant = optionalText(dto.celebrant, 'Celebrante');
    const inScope = await this.hierarchyService.isCommunityInScope(user, dto.communityId);
    if (!inScope) throw new ForbiddenException('Comunidade fora do seu escopo');
    // O membro precisa ser da comunidade do processo (ou gerenciável pelo
    // ator): um memberId de outra paróquia gravaria sacramento nele
    await this.assertMemberForCommunity(dto.memberId, dto.communityId, user);

    const process = await this.prisma.sacramentProcess.create({
      data: {
        type: dto.type,
        memberId: dto.memberId,
        communityId: dto.communityId,
        involved: (dto.involved as Prisma.InputJsonValue) ?? undefined,
        documentsChecklist: (dto.documentsChecklist as Prisma.InputJsonValue) ?? undefined,
        scheduledDate,
        celebrant,
      },
    });
    await this.auditService.log({ actor: this.auditActor(user), action: 'CREATE', entity: 'SacramentProcess', entityId: process.id });
    return process;
  }

  async list(user: CurrentUser, status?: SacramentProcessStatus) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    // Escopo hierárquico (diocese/paróquia/comunidade); sem escopo resolvido
    // — ex.: diocesano sem diocese — a lista é vazia, nunca "todo o país"
    const scope = communityScopeWhere(user);
    if (!scope) return [];
    if (Object.keys(scope).length) where.community = scope;
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

  /**
   * O membro do processo precisa existir e pertencer à comunidade do
   * processo — principal ou vínculo secundário ATIVO — ou a outra comunidade
   * do escopo do ator (secretaria paroquial atendendo membro de capela; o
   * processo só é gerido por COMMUNITY_COORDINATOR ou acima).
   * Fora disso, negar: o sacramento seria gravado no histórico de alguém de
   * outra paróquia.
   */
  private async assertMemberForCommunity(memberId: string, communityId: string, user: CurrentUser) {
    if (!memberId) throw new BadRequestException('Informe o membro');
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: { id: true, communityId: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (member.communityId === communityId) return member;
    const link = await this.prisma.memberCommunity.findFirst({
      where: { memberId, communityId, isActive: true },
      select: { id: true },
    });
    if (link) return member;
    if (member.communityId && (await this.hierarchyService.isCommunityInScope(user, member.communityId))) {
      return member;
    }
    throw new ForbiddenException('Membro fora da comunidade do processo');
  }

  /**
   * Troca de etapa. CELEBRATED só pela celebração (que grava o Sacrament e o
   * livro/folha/termo) e um processo celebrado não volta a outra etapa — antes
   * dava para marcar "celebrado" sem sacramento (certidão emitível) ou reabrir
   * e celebrar de novo (Sacrament duplicado).
   */
  async updateStatus(id: string, status: SacramentProcessStatus, user: CurrentUser) {
    if (!this.canManage(user.role)) throw new ForbiddenException('Sem permissão');
    if (status === SacramentProcessStatus.CELEBRATED) {
      throw new BadRequestException('Use a celebração para concluir o processo');
    }
    if (!MANUAL_STATUSES.includes(status)) throw new BadRequestException('Status inválido');
    const process = await this.loadInScope(id, user);
    if (process.status === SacramentProcessStatus.CELEBRATED) {
      throw new BadRequestException('Processo já celebrado — o status não pode mais mudar');
    }
    // Compare-and-set: uma celebração simultânea não é desfeita por este PATCH
    const changed = await this.prisma.sacramentProcess.updateMany({
      where: { id, deletedAt: null, status: { not: SacramentProcessStatus.CELEBRATED } },
      data: { status },
    });
    if (changed.count === 0) {
      throw new BadRequestException('Processo já celebrado — o status não pode mais mudar');
    }
    return this.prisma.sacramentProcess.findFirst({ where: { id } });
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
    if (process.status === SacramentProcessStatus.CANCELLED) {
      throw new BadRequestException('Processo cancelado — reabra antes de celebrar');
    }
    // Processos antigos podem ter memberId de fora (antes da validação no
    // create): revalida antes de gravar o Sacrament definitivo
    await this.assertMemberForCommunity(process.memberId, process.communityId, user);

    // Data civil validada (400, não 500), sem futuro, ao meio-dia de Brasília
    const date = dto.date ? parseCivilDate(dto.date, 'Data da celebração') : new Date();
    const minister = optionalText(dto.minister, 'Celebrante') ?? process.celebrant ?? null;
    const place = optionalText(dto.place, 'Local', 200);
    const book = optionalText(dto.book, 'Livro', 40);
    const page = optionalText(dto.page, 'Folha', 40);
    const term = optionalText(dto.term, 'Termo', 40);
    const result = await this.prisma.$transaction(async (prisma) => {
      // Lock por membro (mesma chave da catequese) + compare-and-set do
      // status: duplo clique/celebrações simultâneas não geram dois Sacrament
      await prisma.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'parish:member:' + process.memberId}))::text`;
      const claimed = await prisma.sacramentProcess.updateMany({
        where: {
          id,
          deletedAt: null,
          status: { notIn: [SacramentProcessStatus.CELEBRATED, SacramentProcessStatus.CANCELLED] },
        },
        data: { status: SacramentProcessStatus.CELEBRATED },
      });
      if (claimed.count === 0) {
        throw new BadRequestException('Processo já celebrado');
      }
      // Batismo, Crisma e Ordem imprimem caráter: não se repetem. Conferido
      // sob o lock do membro (a catequese grava sacramento com a mesma chave);
      // o erro desfaz o CAS acima junto com a transação
      if (UNREPEATABLE_SACRAMENTS.includes(process.type)) {
        const already = await prisma.sacrament.findFirst({
          where: { memberId: process.memberId, type: process.type },
          select: { id: true },
        });
        if (already) {
          throw new ConflictException(
            `Este membro já tem ${SACRAMENT_LABELS[process.type] ?? process.type} registrado — o sacramento não se repete. Confira o histórico sacramental ou cancele o processo.`,
          );
        }
      }
      const sacrament = await prisma.sacrament.create({
        data: {
          memberId: process.memberId,
          type: process.type,
          date,
          place,
          minister,
          book,
          page,
          term,
        },
      });
      const updated = await prisma.sacramentProcess.update({
        where: { id },
        data: {
          status: SacramentProcessStatus.CELEBRATED,
          sacramentId: sacrament.id,
          book,
          page,
          term,
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
    // Data, celebrante e local vêm do Sacrament gravado NA CELEBRAÇÃO — o
    // agendamento (scheduledDate/celebrant) pode ter mudado ou nem existir.
    const sacrament = process.sacramentId
      ? await this.prisma.sacrament.findUnique({
          where: { id: process.sacramentId },
          select: { date: true, minister: true, place: true, book: true, page: true, term: true },
        })
      : null;
    // Celebrado LEGADO sem Sacrament (status trocado à mão, antes da trava):
    // a 2ª via sai com os dados do próprio processo e o aviso de que vêm do
    // agendamento — antes era 400 e a família ficava sem documento
    const legacy = !sacrament;
    const record = sacrament ?? {
      date: process.scheduledDate ?? null,
      minister: process.celebrant ?? null,
      place: null as string | null,
      book: null as string | null,
      page: null as string | null,
      term: null as string | null,
    };
    await this.auditService.log({ actor: this.auditActor(user), action: 'EXPORT', entity: 'SacramentProcess', entityId: id, metadata: { certificate: true, ...(legacy ? { fromSchedule: true } : {}) } });

    return this.pdfService.renderTableDocument({
      title: `Certidão de ${SACRAMENT_LABELS[process.type] ?? process.type}`,
      subtitle: `${process.community.parish.name} — ${process.community.name}`,
      sections: [
        {
          ...(legacy
            ? {
                subheading:
                  'Aviso: processo celebrado antes do registro da celebração no sistema — data e celebrante são os dados do agendamento. Confira com o livro de registro.',
              }
            : {}),
          columns: ['Campo', 'Valor'],
          widths: [1, 2],
          rows: [
            ['Nome', process.member.fullName],
            ['Livro', process.book || record.book || '-'],
            ['Folha', process.page || record.page || '-'],
            ['Termo', process.term || record.term || '-'],
            ['Data', record.date ? formatCivilDate(record.date) : '-'],
            ['Celebrante', record.minister || '-'],
            ['Local', record.place || '-'],
          ],
        },
      ],
      footer: `Emitido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    });
  }
}
