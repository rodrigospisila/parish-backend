import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { SacramentProcessStatus, SacramentRecordKind, SacramentType, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { communityScopeWhere } from '../pastorals/coordination-scope';
import { civilDateAt, parseCivilDate, todayCivil } from '../catechesis/civil-date';
import {
  assertMayKeepSacramentRecords,
  buildPersonSnapshot,
  INFORMED_NO_CERTIFICATE_MESSAGE,
  isCatechesisCompletionRecord,
  isOtherDenominationRecord,
  isUnrepeatableSacrament,
  lockMemberSacraments,
  OTHER_DENOMINATION_NOT_RECORD_MESSAGE,
  parseFinalidade,
  RECTIFICATION_REASON_MIN,
  SACRAMENT_LABELS,
} from '../sacraments/sacrament-record';
import { CertificateResult, SacramentCertificateService } from '../sacraments/sacrament-certificate.service';

/** Status que o PATCH :id/status aceita — CELEBRATED só pela celebração. */
const MANUAL_STATUSES: SacramentProcessStatus[] = [
  SacramentProcessStatus.REQUESTED,
  SacramentProcessStatus.DOCUMENTS,
  SacramentProcessStatus.COURSE,
  SacramentProcessStatus.SCHEDULED,
  SacramentProcessStatus.CANCELLED,
];

/**
 * Decisão explícita da celebração quando o membro já tem o sacramento
 * irrepetível só INFORMADO (sem assento):
 * - RECORD_INFORMED: o informado é deste sacramento, celebrado aqui e nunca
 *   lavrado — a celebração lavra o assento sobre ele (não vale para batismo
 *   de outra denominação);
 * - CONDITIONAL: dúvida séria sobre a validade/existência do anterior
 *   (cân. 845 §2 e 869) — novo assento "sob condição", o informado fica.
 * Ambas exigem `resolutionReason` (mín. 10) e vão para a auditoria.
 */
export type InformedResolution = 'RECORD_INFORMED' | 'CONDITIONAL';
const INFORMED_RESOLUTIONS: InformedResolution[] = ['RECORD_INFORMED', 'CONDITIONAL'];

/** Código do 409 que pede a decisão explícita (o painel oferece as opções). */
export const INFORMED_DECISION_REQUIRED = 'SACRAMENT_INFORMED_DECISION_REQUIRED';

/** Campos do Sacrament conferidos na celebração (dedup + antes/depois). */
const EXISTING_SACRAMENT_SELECT = {
  id: true,
  recordKind: true,
  date: true,
  place: true,
  minister: true,
  book: true,
  page: true,
  term: true,
  notes: true,
} as const;

type ExistingSacrament = Prisma.SacramentGetPayload<{ select: typeof EXISTING_SACRAMENT_SELECT }>;

/** Resultado da conferência dos registros informados na celebração. */
interface CelebrationPlan {
  /** INFORMED sobre o qual o assento é lavrado (null = cria assento novo) */
  promote: ExistingSacrament | null;
  /** Celebração sob condição (cân. 845 §2 e 869) */
  conditional: boolean;
}

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
 *
 * A preparação (criar, etapas, checklist) é da coordenação; celebrar (gravar o
 * assento) e emitir a certidão seguem a parametrização da comunidade do membro
 * (`laySacramentRecords`) — eng-acessos-08.
 */
@Injectable()
export class SacramentProcessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly certificateService: SacramentCertificateService,
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
      // Campos da pessoa: personSnapshot do assento gravado na celebração
      select: {
        id: true,
        communityId: true,
        status: true,
        fullName: true,
        birthDate: true,
        fatherName: true,
        motherName: true,
      },
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

  /**
   * Celebra: grava o assento (Sacrament RECORD) + numeração e conclui o processo.
   *
   * Batismo, Crisma e Ordem imprimem caráter e não se repetem (cân. 845 §1).
   * Conferido sob o lock do membro (mesma chave da catequese e do histórico):
   * - já há ASSENTO do tipo → 409, sempre;
   * - há só INFORMADO gerado pela conclusão da catequese → a celebração lavra
   *   o assento nele (cat-gestao-11), com antes/depois na auditoria;
   * - há INFORMADO de outra origem (outra denominação, outra paróquia,
   *   histórico trazido pela família) → 409 com `code`
   *   SACRAMENT_INFORMED_DECISION_REQUIRED até vir a decisão explícita
   *   (`informedResolution` + `resolutionReason`). Batismo de outra
   *   denominação NUNCA vira assento desta paróquia: o único caminho é o
   *   batismo sob condição (novo assento; o informado fica como está).
   */
  async celebrate(
    id: string,
    dto: {
      date?: string;
      minister?: string;
      book?: string;
      page?: string;
      term?: string;
      place?: string;
      informedResolution?: string;
      resolutionReason?: string;
    },
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
    const member = await this.assertMemberForCommunity(process.memberId, process.communityId, user);
    // Gravar o assento: coordenador leigo só com a comunidade do membro liberada
    await assertMayKeepSacramentRecords(this.prisma, user, member.communityId || process.communityId);
    const personSnapshot = buildPersonSnapshot(member);
    const resolution = this.parseInformedResolution(dto);

    // Data civil validada (400, não 500), sem futuro, ao meio-dia de Brasília.
    // Sem data: o dia civil de HOJE em Brasília, também ao meio-dia — a hora
    // real (new Date()) à noite já é o dia seguinte em UTC
    const date = dto.date ? parseCivilDate(dto.date, 'Data da celebração') : civilDateAt(todayCivil());
    const minister = optionalText(dto.minister, 'Celebrante') ?? process.celebrant ?? null;
    const place = optionalText(dto.place, 'Local', 200);
    const book = optionalText(dto.book, 'Livro', 40);
    const page = optionalText(dto.page, 'Folha', 40);
    const term = optionalText(dto.term, 'Termo', 40);
    const result = await this.prisma.$transaction(async (prisma) => {
      // Lock por membro (mesma chave da catequese) + compare-and-set do
      // status: duplo clique/celebrações simultâneas não geram dois Sacrament
      await lockMemberSacraments(prisma, process.memberId);
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
      // Qualquer erro abaixo desfaz o CAS acima junto com a transação
      let plan: CelebrationPlan = { promote: null, conditional: false };
      if (isUnrepeatableSacrament(process.type)) {
        // Todos os registros do tipo: o ASSENTO é conferido primeiro, para
        // um INFORMED convivendo com um RECORD não ser promovido (2 assentos)
        const existing = await prisma.sacrament.findMany({
          where: { memberId: process.memberId, type: process.type },
          select: EXISTING_SACRAMENT_SELECT,
          orderBy: { createdAt: 'asc' },
        });
        if (existing.some((row) => row.recordKind !== SacramentRecordKind.INFORMED)) {
          throw new ConflictException(
            `Este membro já tem ${SACRAMENT_LABELS[process.type] ?? process.type} registrado — o sacramento não se repete. Confira o histórico sacramental ou cancele o processo.`,
          );
        }
        plan = this.planOverInformed(process.type, existing, resolution);
      }

      const recordData = {
        date,
        place,
        minister,
        book,
        page,
        term,
        recordKind: SacramentRecordKind.RECORD,
        ...(personSnapshot ? { personSnapshot } : {}),
      };
      const reasonSuffix = resolution ? ` — ${resolution.reason}` : '';
      const sacrament = plan.promote
        ? await prisma.sacrament.update({
            where: { id: plan.promote.id },
            data: {
              ...recordData,
              notes: [plan.promote.notes, `Assento lavrado na celebração do processo de preparação${reasonSuffix}`]
                .filter(Boolean)
                .join('\n'),
            },
          })
        : await prisma.sacrament.create({
            data: {
              memberId: process.memberId,
              type: process.type,
              ...recordData,
              ...(plan.conditional ? { notes: `Celebrado sob condição (cân. 845 §2 e 869)${reasonSuffix}` } : {}),
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
      return { sacrament, updated, plan };
    });

    const { plan, sacrament } = result;
    const applied: InformedResolution | null = plan.conditional
      ? 'CONDITIONAL'
      : plan.promote && resolution?.kind === 'RECORD_INFORMED'
        ? 'RECORD_INFORMED'
        : null;
    const decision = applied ? { informedResolution: applied, resolutionReason: resolution?.reason } : {};
    if (plan.promote) {
      // Registro informado promovido a assento: antes/depois na auditoria
      const previous = plan.promote;
      await this.auditService.log({
        actor: this.auditActor(user),
        action: 'UPDATE',
        entity: 'Sacrament',
        entityId: previous.id,
        before: {
          recordKind: previous.recordKind,
          date: previous.date ? previous.date.toISOString() : null,
          place: previous.place,
          minister: previous.minister,
          book: previous.book,
          page: previous.page,
          term: previous.term,
          notes: previous.notes,
        },
        after: {
          recordKind: SacramentRecordKind.RECORD,
          date: date.toISOString(),
          place,
          minister,
          book,
          page,
          term,
          notes: sacrament?.notes ?? null,
        },
        metadata: { memberId: process.memberId, recordedFromProcess: id, ...decision },
      });
    }
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'UPDATE',
      entity: 'SacramentProcess',
      entityId: id,
      metadata: {
        celebrated: true,
        sacramentId: sacrament.id,
        ...(plan.promote ? { promotedFromInformed: plan.promote.id } : {}),
        ...decision,
      },
    });
    return result.updated;
  }

  /** `informedResolution` + `resolutionReason` da celebração (ambos ou nenhum). */
  private parseInformedResolution(dto: { informedResolution?: unknown; resolutionReason?: unknown }) {
    const raw = dto.informedResolution;
    if (raw === undefined || raw === null || raw === '') return null;
    if (typeof raw !== 'string' || !INFORMED_RESOLUTIONS.includes(raw as InformedResolution)) {
      throw new BadRequestException('Decisão sobre o sacramento informado inválida');
    }
    const reason = optionalText(dto.resolutionReason, 'Motivo', 500);
    if (!reason || reason.length < RECTIFICATION_REASON_MIN) {
      throw new BadRequestException('Informe o motivo da decisão (mínimo de 10 caracteres)');
    }
    return { kind: raw as InformedResolution, reason };
  }

  /**
   * O que fazer com os registros INFORMADOS do sacramento irrepetível (sem
   * assento) na celebração — ver o comentário de `celebrate`.
   */
  private planOverInformed(
    type: SacramentType,
    informed: ExistingSacrament[],
    resolution: { kind: InformedResolution; reason: string } | null,
  ): CelebrationPlan {
    if (resolution?.kind === 'CONDITIONAL') return { promote: null, conditional: true };
    if (!informed.length) {
      if (resolution?.kind === 'RECORD_INFORMED') {
        throw new BadRequestException('Não há sacramento informado para lavrar o assento');
      }
      return { promote: null, conditional: false };
    }
    // Batismo de outra denominação: válido não se repete e não vira assento
    // católico desta paróquia — nem com a decisão de lavrar sobre ele
    if (informed.some((row) => isOtherDenominationRecord(row))) {
      throw new ConflictException({
        code: INFORMED_DECISION_REQUIRED,
        options: ['CONDITIONAL'],
        message: OTHER_DENOMINATION_NOT_RECORD_MESSAGE,
      });
    }
    const fromCatechesis = informed.find((row) => isCatechesisCompletionRecord(row));
    if (resolution?.kind === 'RECORD_INFORMED') {
      return { promote: fromCatechesis ?? informed[0], conditional: false };
    }
    // Conclusão da catequese: o assento desse mesmo sacramento ainda não foi
    // lavrado — a celebração o lavra (fluxo previsto, sem decisão extra)
    if (fromCatechesis) return { promote: fromCatechesis, conditional: false };
    throw new ConflictException({
      code: INFORMED_DECISION_REQUIRED,
      options: ['RECORD_INFORMED', 'CONDITIONAL'],
      message: `Este membro já tem ${SACRAMENT_LABELS[type] ?? type} informado no histórico (sem assento) — o sacramento não se repete. Se foi celebrado nesta paróquia e falta lavrar o assento, confirme a lavratura sobre o registro informado; se houver dúvida séria sobre a validade, registre a celebração sob condição; senão, cancele o processo.`,
    });
  }

  /**
   * Certidão em PDF (também 2ª via): "Certidão" com livro+folha+termo, senão
   * "Declaração para conferência". `finalidade` opcional (até 120 caracteres).
   */
  async certificate(id: string, user: CurrentUser, finalidadeRaw?: unknown): Promise<CertificateResult> {
    const finalidade = parseFinalidade(finalidadeRaw);
    const process = await this.prisma.sacramentProcess.findFirst({
      where: { id, deletedAt: null },
      include: { member: { select: { communityId: true } } },
    });
    if (!process) throw new NotFoundException('Processo não encontrado');
    const inScope = await this.hierarchyService.isCommunityInScope(user, process.communityId);
    if (!inScope) throw new ForbiddenException('Fora do seu escopo');
    if (process.status !== SacramentProcessStatus.CELEBRATED) {
      throw new BadRequestException('Certidão disponível apenas após a celebração');
    }
    // Emitir certidão: coordenador leigo só com a comunidade do membro liberada
    await assertMayKeepSacramentRecords(this.prisma, user, process.member?.communityId || process.communityId);
    // O ASSENTO (Sacrament gravado na celebração e talvez retificado depois
    // por PATCH /sacraments/:id) é a fonte única de tipo, data, celebrante,
    // local e livro/folha/termo — a mesma certidão do histórico. O
    // agendamento e a numeração copiada para o processo só valem no legado.
    const sacrament = process.sacramentId
      ? await this.prisma.sacrament.findUnique({
          where: { id: process.sacramentId },
          select: {
            type: true,
            date: true,
            minister: true,
            place: true,
            book: true,
            page: true,
            term: true,
            recordKind: true,
            personSnapshot: true,
          },
        })
      : null;
    if (sacrament?.recordKind === SacramentRecordKind.INFORMED) {
      throw new ConflictException(INFORMED_NO_CERTIFICATE_MESSAGE);
    }
    // Celebrado LEGADO sem Sacrament (status trocado à mão, antes da trava):
    // a 2ª via sai com os dados do próprio processo e o aviso de que vêm do
    // agendamento — sempre como declaração para conferência
    const legacy = !sacrament;
    const result = await this.certificateService.render({
      record: sacrament
        ? {
            type: sacrament.type ?? process.type,
            date: sacrament.date,
            minister: sacrament.minister,
            place: sacrament.place ?? null,
            book: sacrament.book ?? null,
            page: sacrament.page ?? null,
            term: sacrament.term ?? null,
            personSnapshot: sacrament.personSnapshot,
          }
        : {
            type: process.type,
            date: process.scheduledDate ?? null,
            minister: process.celebrant ?? null,
            place: null,
            book: process.book || null,
            page: process.page || null,
            term: process.term || null,
          },
      memberId: process.memberId,
      communityId: process.communityId,
      involved: process.involved,
      finalidade,
      legacyFromSchedule: legacy,
    });
    await this.auditService.log({
      actor: this.auditActor(user),
      action: 'EXPORT',
      entity: 'SacramentProcess',
      entityId: id,
      metadata: {
        certificate: true,
        kind: result.kind,
        ...(legacy ? { fromSchedule: true } : {}),
        ...(finalidade ? { finalidade } : {}),
      },
    });
    return result;
  }
}
