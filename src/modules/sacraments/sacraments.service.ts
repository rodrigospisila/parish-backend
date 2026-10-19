import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Sacrament, SacramentRecordKind, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { HierarchyService, CurrentUser } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { CreateSacramentDto } from './dto/create-sacrament.dto';
import { UpdateSacramentDto } from './dto/update-sacrament.dto';
import { civilDateAt, civilDayOrNull, formatCivilDate } from '../catechesis/civil-date';
import {
  assertMayKeepSacramentRecords,
  buildPersonSnapshot,
  INFORMED_NO_CERTIFICATE_MESSAGE,
  parseFinalidade,
  personForRecord,
  RECORD_DELETE_DENIED_MESSAGE,
  RECTIFICATION_REASON_MESSAGE,
  RECTIFICATION_REASON_MIN,
} from './sacrament-record';
import { CertificateResult, SacramentCertificateService } from './sacrament-certificate.service';

/** Campos de texto do assento comparados/gravados como "texto ou null". */
const RECORD_TEXT_FIELDS = ['place', 'minister', 'book', 'page', 'term'] as const;

/** Campos do cadastro do membro usados no escopo e no personSnapshot. */
const MEMBER_RECORD_SELECT = {
  id: true,
  userId: true,
  communityId: true,
  status: true,
  fullName: true,
  birthDate: true,
  fatherName: true,
  motherName: true,
} as const;

function optionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean || null;
}

/** AAAA-MM-DD vira meio-dia de Brasília (dia civil estável); ISO completo fica como veio. */
function toSacramentDate(raw: string): Date {
  const civil = civilDayOrNull(raw);
  const date = civil && raw.length === 10 ? civilDateAt(civil) : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Data inválida');
  return date;
}

function auditValue(value: unknown) {
  return value instanceof Date ? value.toISOString() : (value ?? null);
}

/**
 * Histórico sacramental do membro (roadmap 2.1) e assento do livro paroquial.
 *
 * - `recordKind = RECORD` é o ASSENTO (livro/folha/termo, certidão): não se
 *   apaga (DELETE só SYSTEM_ADMIN) e só se corrige por RETIFICAÇÃO com motivo,
 *   auditada com antes/depois (cân. 535 — cat-gestao-08).
 * - `recordKind = INFORMED` é o sacramento apenas informado (catequese, outra
 *   denominação, histórico trazido pela família): não gera certidão.
 * - Coordenador leigo registra/retifica assento e emite certidão só se a
 *   comunidade do membro ligar `laySacramentRecords` (eng-acessos-08).
 * - O assento guarda `personSnapshot` (nome, nascimento, filiação) para
 *   sobreviver à anonimização LGPD do cadastro (cat-gestao-09).
 */
@Injectable()
export class SacramentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchyService: HierarchyService,
    private readonly auditService: AuditService,
    private readonly certificateService: SacramentCertificateService,
  ) {}

  private auditActor(user?: CurrentUser) {
    return user ? { id: user.id, email: user.email, role: user.role } : null;
  }

  /** O membro precisa existir, não estar excluído e estar no escopo do usuário. */
  private async assertMemberScope(memberId: string, currentUser: CurrentUser) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, deletedAt: null },
      select: MEMBER_RECORD_SELECT,
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
    const member = await this.assertMemberScope(dto.memberId, currentUser);
    const recordKind = dto.recordKind ?? SacramentRecordKind.RECORD;
    if (recordKind === SacramentRecordKind.RECORD) {
      await assertMayKeepSacramentRecords(this.prisma, currentUser, member.communityId);
    }
    const snapshot = recordKind === SacramentRecordKind.RECORD ? buildPersonSnapshot(member) : null;

    const sacrament = await this.prisma.sacrament.create({
      data: {
        memberId: dto.memberId,
        type: dto.type,
        date: toSacramentDate(dto.date),
        place: optionalText(dto.place),
        minister: optionalText(dto.minister),
        notes: dto.notes ?? null,
        book: optionalText(dto.book),
        page: optionalText(dto.page),
        term: optionalText(dto.term),
        recordKind,
        ...(snapshot ? { personSnapshot: snapshot } : {}),
      },
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'CREATE',
      entity: 'Sacrament',
      entityId: sacrament.id,
      metadata: { memberId: dto.memberId, type: dto.type, recordKind },
    });

    return sacrament;
  }

  /**
   * Histórico do membro. `personName` é o nome como consta no assento: o do
   * personSnapshot quando existe (cadastro anonimizado continua mostrando a
   * pessoa do registro canônico); senão o nome atual do cadastro.
   */
  async findByMember(memberId: string, currentUser: CurrentUser) {
    const member = await this.assertMemberScope(memberId, currentUser);

    const rows = await this.prisma.sacrament.findMany({
      where: { memberId },
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => ({
      ...row,
      personName: personForRecord(member, row.personSnapshot)?.fullName ?? member.fullName,
    }));
  }

  private async loadSacramentOrThrow(id: string) {
    const sacrament = await this.prisma.sacrament.findUnique({ where: { id } });
    if (!sacrament) {
      throw new NotFoundException('Sacramento não encontrado');
    }
    return sacrament;
  }

  /**
   * Edição. Num assento (RECORD), mudar tipo, data, ministro, local,
   * livro/folha/termo ou o próprio recordKind é RETIFICAÇÃO: exige
   * `rectificationReason` (mín. 10), anota no `notes` e audita antes/depois
   * com o motivo. Só as mudanças EFETIVAS contam (o painel reenvia tudo).
   * Passar um INFORMED para RECORD é lavrar o assento (sem motivo).
   */
  async update(id: string, dto: UpdateSacramentDto, currentUser: CurrentUser) {
    const sacrament = await this.loadSacramentOrThrow(id);
    const member = await this.assertMemberScope(sacrament.memberId, currentUser);

    const nextKind = dto.recordKind ?? sacrament.recordKind;
    const isRecord = sacrament.recordKind === SacramentRecordKind.RECORD;
    if (isRecord || nextKind === SacramentRecordKind.RECORD) {
      await assertMayKeepSacramentRecords(this.prisma, currentUser, member.communityId);
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    const data: Prisma.SacramentUpdateInput = {};
    const track = (field: keyof Sacrament, next: unknown) => {
      before[field] = auditValue(sacrament[field]);
      after[field] = auditValue(next);
      (data as any)[field] = next;
    };

    if (dto.type !== undefined && dto.type !== sacrament.type) track('type', dto.type);
    if (dto.date !== undefined) {
      const nextDate = toSacramentDate(dto.date);
      // Mesmo dia civil = sem mudança (o painel reenvia a data em ISO)
      if (formatCivilDate(nextDate) !== formatCivilDate(sacrament.date)) track('date', nextDate);
    }
    for (const field of RECORD_TEXT_FIELDS) {
      if (dto[field] === undefined) continue;
      const next = optionalText(dto[field]);
      if (next !== (sacrament[field] ?? null)) track(field, next);
    }
    if (nextKind !== sacrament.recordKind) track('recordKind', nextKind);

    const rectifiedFields = Object.keys(after);
    const rectification = isRecord && rectifiedFields.length > 0;
    const reason = optionalText(dto.rectificationReason);
    if (rectification && (!reason || reason.length < RECTIFICATION_REASON_MIN)) {
      throw new BadRequestException(RECTIFICATION_REASON_MESSAGE);
    }

    let notes = dto.notes !== undefined ? (dto.notes ?? null) : sacrament.notes;
    if (rectification) {
      // Anotação permanente no próprio assento (a auditoria expira em 5 anos)
      const annotation = `Retificação em ${formatCivilDate(new Date())}: ${reason}`;
      notes = notes ? `${notes}\n${annotation}` : annotation;
    }
    if (notes !== sacrament.notes) data.notes = notes;

    // Assento (criado, lavrado ou retificado) guarda a pessoa como está agora;
    // cadastro já anonimizado mantém o snapshot que houver
    if (
      nextKind === SacramentRecordKind.RECORD &&
      (rectifiedFields.length > 0 || !sacrament.personSnapshot)
    ) {
      const snapshot = buildPersonSnapshot(member);
      if (snapshot) data.personSnapshot = snapshot;
    }

    if (!Object.keys(data).length) return sacrament;

    const updated = await this.prisma.sacrament.update({ where: { id }, data });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'UPDATE',
      entity: 'Sacrament',
      entityId: id,
      ...(rectifiedFields.length ? { before, after } : {}),
      metadata: {
        memberId: sacrament.memberId,
        changedFields: Object.keys(data).filter((key) => key !== 'personSnapshot'),
        ...(rectification ? { rectification: true, rectificationReason: reason } : {}),
      },
    });

    return updated;
  }

  /**
   * Assento sacramental não se apaga (cat-gestao-08): só a administração da
   * plataforma remove (registro duplicado/lançado por engano), com o assento
   * inteiro na auditoria. A gestão da paróquia usa a retificação.
   */
  async remove(id: string, currentUser: CurrentUser) {
    if (currentUser?.role !== UserRole.SYSTEM_ADMIN) {
      throw new ForbiddenException(RECORD_DELETE_DENIED_MESSAGE);
    }
    const sacrament = await this.loadSacramentOrThrow(id);

    // Processo que apontava para este sacramento volta a emitir pela 2ª via
    // de legado (dados do agendamento), em vez de um id que não existe mais
    await this.prisma.sacramentProcess.updateMany({ where: { sacramentId: id }, data: { sacramentId: null } });
    await this.prisma.sacrament.delete({ where: { id } });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'DELETE',
      entity: 'Sacrament',
      entityId: id,
      before: {
        memberId: sacrament.memberId,
        type: sacrament.type,
        recordKind: sacrament.recordKind,
        date: auditValue(sacrament.date),
        place: sacrament.place,
        minister: sacrament.minister,
        book: sacrament.book,
        page: sacrament.page,
        term: sacrament.term,
      },
    });

    return { message: 'Sacramento removido' };
  }

  /**
   * Certidão (ou declaração para conferência) de um assento — inclusive o
   * registrado direto no histórico, sem processo de preparação. INFORMED: 409.
   */
  async certificate(id: string, finalidadeRaw: unknown, currentUser: CurrentUser): Promise<CertificateResult> {
    const finalidade = parseFinalidade(finalidadeRaw);
    const sacrament = await this.loadSacramentOrThrow(id);
    // Membro excluído (soft delete) continua com o assento certificável
    const member = await this.prisma.member.findUnique({
      where: { id: sacrament.memberId },
      select: { id: true, communityId: true },
    });
    if (!member) throw new NotFoundException('Membro não encontrado');
    if (
      currentUser.role !== UserRole.SYSTEM_ADMIN &&
      !(await this.hierarchyService.canManageMember(currentUser.id, member.id))
    ) {
      throw new ForbiddenException('Você não tem permissão para acessar os sacramentos deste membro');
    }
    await assertMayKeepSacramentRecords(this.prisma, currentUser, member.communityId);
    if (sacrament.recordKind === SacramentRecordKind.INFORMED) {
      throw new ConflictException(INFORMED_NO_CERTIFICATE_MESSAGE);
    }

    // Padrinhos/testemunhas: do processo de preparação que gerou o assento
    const process = await this.prisma.sacramentProcess.findFirst({
      where: { sacramentId: id, deletedAt: null },
      select: { involved: true, communityId: true },
    });
    const result = await this.certificateService.render({
      record: sacrament,
      memberId: member.id,
      communityId: process?.communityId ?? member.communityId,
      involved: process?.involved,
      finalidade,
    });

    await this.auditService.log({
      actor: this.auditActor(currentUser),
      action: 'EXPORT',
      entity: 'Sacrament',
      entityId: id,
      metadata: { certificate: true, kind: result.kind, ...(finalidade ? { finalidade } : {}) },
    });
    return result;
  }
}
