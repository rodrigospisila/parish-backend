import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { MemberStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CurrentUser, HierarchyService, isNoAccessWhere } from '../../common/hierarchy.service';
import { AuditService } from '../../common/audit.service';
import { PlanAccessService } from '../plans/plan-access.service';
import { MEMBER_LIMIT_MESSAGE } from '../plans/member-limit.guard';
import { MembersService } from './members.service';
import {
  DuplicateReason,
  IMPORT_MAX_ROWS,
  ImportAction,
  ImportKind,
  ImportMemberData,
  ParsedImportRow,
  foldName,
  parseImportRow,
} from './member-import';

const IMPORT_ACTIONS: ImportAction[] = ['CREATE', 'UPDATE', 'SKIP'];

/** Linhas por transação: um bloco que falha não leva a importação inteira junto. */
export const IMPORT_CHUNK_SIZE = 200;

/** Mesma mensagem do cadastro (handleUniqueConstraint): não revela onde o CPF está. */
const CPF_OUT_OF_SCOPE = 'Não foi possível usar este CPF — confira o número ou procure a secretaria da paróquia';

export interface ImportRequest {
  kind?: ImportKind;
  communityId: string;
  rows: Array<Record<string, unknown>>;
  dryRun?: boolean;
  /** O que fazer com o duplicado PROVÁVEL (CPF, nome+nascimento, telefone+nome) */
  onDuplicate?: ImportAction;
  /** Decisão por linha (1 = primeira linha de `rows`) — vence o `onDuplicate` */
  rowActions?: Record<string, ImportAction>;
}

interface Candidate extends ImportMemberData {
  id: string;
  communityId: string;
  community: { name: string } | null;
  tither: { id: string; registrationNumber: string | null; status: string } | null;
}

export interface ImportRowResult {
  line: number;
  status: 'OK' | 'DUPLICATE' | 'ERROR';
  action: ImportAction | null;
  fullName: string | null;
  /** Como será gravado (telefone em E.164, nascimento dd/mm/aaaa ou dd/mm) */
  normalized: { phone: string | null; birthDate: string | null } | null;
  errors: string[];
  warnings: string[];
  duplicate: {
    memberId: string;
    fullName: string;
    communityName: string | null;
    reasons: DuplicateReason[];
    /** CPF, nome+nascimento ou telefone+mesmo nome; só telefone = fraco (família) */
    strong: boolean;
    isTither: boolean;
  } | null;
  /** Membro criado/atualizado (só quando gravou) */
  memberId?: string;
}

const MEMBER_FIELDS: Array<keyof ImportMemberData> = [
  'fullName', 'cpf', 'rg', 'email', 'phone', 'birthDate', 'gender', 'notes', 'zipCode', 'street', 'number',
  'complement', 'neighborhood', 'city', 'state', 'fatherName', 'motherName',
];

const CANDIDATE_SELECT = {
  id: true,
  communityId: true,
  community: { select: { name: true } },
  tither: { select: { id: true, registrationNumber: true, status: true } },
  ...Object.fromEntries(MEMBER_FIELDS.map((field) => [field, true])),
} as const;

const formatBirth = (date: Date | null, yearUnknown: boolean) => {
  if (!date) return null;
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return yearUnknown ? `${dd}/${mm}` : `${dd}/${mm}/${date.getUTCFullYear()}`;
};

/** Variantes de dígitos do telefone (+55 e sem o 55) para casar com cadastros antigos. */
const phoneVariants = (digits: string | null): string[] => {
  if (!digits) return [];
  if (digits.startsWith('55') && digits.length >= 12) return [digits, digits.slice(2)];
  return [digits, `55${digits}`];
};

/**
 * Importação de planilhas (C5): `MEMBERS` (pessoas) e `TITHERS` (dizimistas =
 * membro + registro `Tither`, do mesmo jeito que o dízimo grava: upsert por
 * `memberId`, `status` ACTIVE, `registrationNumber` = nº/envelope, `joinedAt`
 * = adesão). `dryRun` devolve a prévia por linha sem gravar.
 *
 * Duplicado provável (só no escopo de leitura de quem importa, e dentro da
 * paróquia da comunidade de destino): mesmo CPF, mesmo nome (sem acento) +
 * nascimento, ou mesmo telefone. Telefone com nome diferente é FRACO (família
 * divide o celular): por padrão vira cadastro novo, sinalizado na prévia.
 */
@Injectable()
export class MemberImportService {
  private readonly logger = new Logger(MemberImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hierarchy: HierarchyService,
    private readonly audit: AuditService,
    private readonly members: MembersService,
    @Optional() private readonly planAccess?: PlanAccessService,
  ) {}

  async run(request: ImportRequest, currentUser: CurrentUser) {
    const kind: ImportKind = request.kind ?? 'MEMBERS';
    const dryRun = request.dryRun === true;
    const rows = Array.isArray(request.rows) ? request.rows : [];
    if (rows.length > IMPORT_MAX_ROWS) {
      throw new BadRequestException(`Envie no máximo ${IMPORT_MAX_ROWS} linhas por vez`);
    }
    for (const [line, action] of Object.entries(request.rowActions ?? {})) {
      if (!IMPORT_ACTIONS.includes(action)) {
        throw new BadRequestException(`Ação inválida na linha ${line}: use CREATE, UPDATE ou SKIP`);
      }
    }

    const community = await this.prisma.community.findFirst({
      where: { id: request.communityId, deletedAt: null },
      select: { id: true, name: true, parishId: true },
    });
    if (!community) throw new NotFoundException('Comunidade não encontrada');
    // Mesma regra da criação: destino no escopo de GESTÃO de quem importa
    if (!(await this.members.canManageMembersIn(currentUser, community.id))) {
      throw new ForbiddenException('Você não tem permissão para importar nesta comunidade');
    }

    const now = new Date();
    const parsed = rows.map((row, index) => parseImportRow(row ?? {}, index + 1, kind, now));
    this.markRepeatedInFile(parsed);

    const candidates = await this.findCandidates(parsed, community.parishId, currentUser);
    const foreignCpfs = await this.cpfsOutsideScope(parsed, candidates);
    const manageable = await this.manageableCommunityIds(currentUser);
    const usedRegistrations = kind === 'TITHERS' ? await this.registrationsInUse(parsed, community.parishId) : new Map();

    const results: ImportRowResult[] = parsed.map((row) =>
      this.planRow(row, kind, request, candidates, foreignCpfs, manageable, usedRegistrations),
    );

    const toCreate = results.filter((r) => r.action === 'CREATE').length;
    const memberLimit = await this.memberLimit(community.id, toCreate, currentUser);
    if (!dryRun && memberLimit?.exceeds && memberLimit.enforced) {
      throw new ForbiddenException({
        code: 'PLAN_MEMBER_LIMIT',
        communityId: community.id,
        maxMembers: memberLimit.maxMembers,
        activeMembers: memberLimit.activeMembers,
        message: MEMBER_LIMIT_MESSAGE,
      });
    }

    if (!dryRun) {
      await this.write(parsed, results, kind, community.id, candidates);
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.action === 'CREATE' && r.status !== 'ERROR').length,
      updated: results.filter((r) => r.action === 'UPDATE' && r.status !== 'ERROR').length,
      skipped: results.filter((r) => r.action === 'SKIP').length,
      failed: results.filter((r) => r.status === 'ERROR').length,
    };

    if (!dryRun) {
      await this.audit.log({
        actor: { id: currentUser.id, email: currentUser.email, role: currentUser.role },
        action: 'CREATE',
        entity: 'Member',
        metadata: { bulkImport: true, kind, communityId: community.id, ...summary },
      });
      if (memberLimit?.exceeds && !memberLimit.enforced) {
        this.logger.warn(
          `[PLAN_ENFORCEMENT=log] importação passou da faixa: community=${community.id} ` +
            `membros=${memberLimit.activeMembers}+${toCreate} limite=${memberLimit.maxMembers} user=${currentUser.id}`,
        );
      }
    }

    return {
      kind,
      communityId: community.id,
      dryRun,
      ...summary,
      // Compatível com a resposta antiga ({ imported, skipped, errors })
      imported: summary.created,
      errors: results
        .filter((r) => r.status === 'ERROR')
        .map((r) => ({ line: r.line, reason: r.errors.join('; ') })),
      rows: results,
      memberLimit: memberLimit
        ? {
            maxMembers: memberLimit.maxMembers,
            activeMembers: memberLimit.activeMembers,
            afterImport: memberLimit.activeMembers + toCreate,
            exceeds: memberLimit.exceeds,
          }
        : null,
    };
  }

  /** Mesma pessoa duas vezes na planilha (CPF ou nome+nascimento): a repetida vira erro. */
  private markRepeatedInFile(parsed: ParsedImportRow[]) {
    const seen = new Map<string, number>();
    for (const row of parsed) {
      if (!row.data) continue;
      const keys = [
        row.data.cpf ? `cpf:${row.data.cpf}` : null,
        row.nameKey && row.birthKey ? `nb:${row.nameKey}|${row.birthKey}` : null,
      ].filter((k): k is string => !!k);
      const first = keys.map((k) => seen.get(k)).find((line) => line !== undefined);
      if (first !== undefined) {
        row.errors.push(`Repetida na planilha (mesma pessoa da linha ${first})`);
        continue;
      }
      keys.forEach((k) => seen.set(k, row.line));
    }
  }

  /**
   * Cadastros que podem ser a mesma pessoa: na paróquia da comunidade de
   * destino E no escopo de leitura de quem importa (o filtro do Prisma é a
   * palavra final; o SQL só acha os candidatos por CPF/telefone/dia).
   */
  private async findCandidates(
    parsed: ParsedImportRow[],
    parishId: string,
    currentUser: CurrentUser,
  ): Promise<Candidate[]> {
    const cpfs = [...new Set(parsed.map((r) => r.data?.cpf).filter((v): v is string => !!v))];
    const phones = [...new Set(parsed.flatMap((r) => phoneVariants(r.phoneDigits)))];
    const days = [...new Set(parsed.map((r) => r.birthKey).filter((v): v is string => !!v))];
    if (!cpfs.length && !phones.length && !days.length) return [];

    const scope = this.hierarchy.applyMemberFilter(currentUser);
    if (isNoAccessWhere(scope)) return [];

    const idRows = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT m.id FROM members m
      JOIN communities c ON c.id = m."communityId"
      WHERE c."parishId" = ${parishId}
        AND m."deletedAt" IS NULL
        AND m.status::text <> 'ANONYMIZED'
        AND (
          m.cpf = ANY(${cpfs}::text[])
          OR regexp_replace(COALESCE(m.phone, ''), '[^0-9]', '', 'g') = ANY(${phones}::text[])
          OR m."birthDate"::date = ANY(${days}::date[])
        )
      LIMIT 20000
    `);
    const ids = idRows.map((r) => r.id);
    if (!ids.length) return [];
    return (await this.prisma.member.findMany({
      where: { AND: [scope, { id: { in: ids } }, { deletedAt: null }] },
      select: CANDIDATE_SELECT,
    })) as unknown as Candidate[];
  }

  /**
   * CPF que já existe no país FORA dos candidatos (outra paróquia, fora do
   * escopo, cadastro excluído): o índice é único nacional e o create falharia.
   * A linha recebe a mesma mensagem genérica do cadastro (não revela onde).
   */
  private async cpfsOutsideScope(parsed: ParsedImportRow[], candidates: Candidate[]): Promise<Set<string>> {
    const cpfs = [...new Set(parsed.map((r) => r.data?.cpf).filter((v): v is string => !!v))];
    if (!cpfs.length) return new Set();
    const known = new Set(candidates.map((c) => c.cpf).filter(Boolean));
    const rows = await this.prisma.member.findMany({ where: { cpf: { in: cpfs } }, select: { cpf: true } });
    return new Set(rows.map((r) => r.cpf!).filter((cpf) => cpf && !known.has(cpf)));
  }

  /** Comunidades cujos membros quem importa pode ATUALIZAR (null = todas as do escopo de leitura). */
  private async manageableCommunityIds(currentUser: CurrentUser): Promise<Set<string> | null> {
    if (
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      currentUser.role === UserRole.DIOCESAN_ADMIN ||
      currentUser.role === UserRole.PARISH_ADMIN
    ) {
      // Escopo de leitura = escopo de gestão (comunidade principal na diocese/paróquia)
      return null;
    }
    return new Set(await this.hierarchy.getCommunityScopeIds(currentUser));
  }

  /** Nº de dizimista já usado por OUTRA pessoa da paróquia (vira aviso). */
  private async registrationsInUse(parsed: ParsedImportRow[], parishId: string): Promise<Map<string, string>> {
    const numbers = [...new Set(parsed.map((r) => r.tither?.registrationNumber).filter((v): v is string => !!v))];
    if (!numbers.length) return new Map();
    const rows = await this.prisma.tither.findMany({
      where: { registrationNumber: { in: numbers }, member: { deletedAt: null, community: { parishId } } },
      select: { registrationNumber: true, memberId: true },
    });
    return new Map(rows.map((r) => [r.registrationNumber!, r.memberId]));
  }

  private matchCandidate(row: ParsedImportRow, candidates: Candidate[]) {
    if (!row.data) return null;
    const scored = candidates
      .map((candidate) => {
        const reasons: DuplicateReason[] = [];
        const sameName = !!row.nameKey && foldName(candidate.fullName ?? '') === row.nameKey;
        if (row.data!.cpf && candidate.cpf === row.data!.cpf) reasons.push('CPF');
        if (
          sameName &&
          row.birthKey &&
          candidate.birthDate &&
          candidate.birthDate.toISOString().slice(0, 10) === row.birthKey
        ) {
          reasons.push('NAME_BIRTH');
        }
        const candidatePhone = (candidate.phone ?? '').replace(/\D/g, '');
        if (candidatePhone && phoneVariants(row.phoneDigits).includes(candidatePhone)) reasons.push('PHONE');
        const strong = reasons.includes('CPF') || reasons.includes('NAME_BIRTH') || (reasons.includes('PHONE') && sameName);
        return { candidate, reasons, strong };
      })
      .filter((m) => m.reasons.length > 0)
      .sort((a, b) => Number(b.strong) - Number(a.strong) || b.reasons.length - a.reasons.length);
    return scored[0] ?? null;
  }

  private planRow(
    row: ParsedImportRow,
    kind: ImportKind,
    request: ImportRequest,
    candidates: Candidate[],
    foreignCpfs: Set<string>,
    manageable: Set<string> | null,
    usedRegistrations: Map<string, string>,
  ): ImportRowResult {
    const result: ImportRowResult = {
      line: row.line,
      status: 'OK',
      action: null,
      fullName: row.data?.fullName ?? null,
      normalized: row.data
        ? { phone: row.data.phone, birthDate: formatBirth(row.data.birthDate, row.birthYearUnknown) }
        : null,
      errors: [...row.errors],
      warnings: [...row.warnings],
      duplicate: null,
    };

    const match = this.matchCandidate(row, candidates);
    if (match) {
      result.status = 'DUPLICATE';
      result.duplicate = {
        memberId: match.candidate.id,
        fullName: match.candidate.fullName,
        communityName: match.candidate.community?.name ?? null,
        reasons: match.reasons,
        strong: match.strong,
        isTither: !!match.candidate.tither,
      };
    }
    if (row.data?.cpf && foreignCpfs.has(row.data.cpf)) result.errors.push(CPF_OUT_OF_SCOPE);

    if (result.errors.length) {
      result.status = 'ERROR';
      return result;
    }

    const requested = request.rowActions?.[String(row.line)];
    let action: ImportAction;
    if (!match) {
      action = requested === 'SKIP' ? 'SKIP' : 'CREATE';
    } else if (requested) {
      action = requested;
    } else if (match.strong) {
      action = request.onDuplicate ?? (kind === 'TITHERS' ? 'UPDATE' : 'SKIP');
    } else {
      // Só o telefone bate e o nome é outro: provável familiar — cadastro novo
      action = 'CREATE';
    }

    if (match && action === 'CREATE' && match.reasons.includes('CPF')) {
      result.errors.push(`CPF já cadastrado para ${match.candidate.fullName} — escolha atualizar ou ignorar`);
    }
    if (match && action === 'UPDATE' && manageable && !manageable.has(match.candidate.communityId)) {
      result.errors.push('A pessoa já está cadastrada em outra comunidade, fora da sua gestão — fale com a secretaria');
    }
    if (!match && requested === 'UPDATE') {
      result.errors.push('Nenhum cadastro encontrado para atualizar nesta linha');
    }
    if (result.errors.length) {
      result.status = 'ERROR';
      return result;
    }

    const registration = row.tither?.registrationNumber;
    if (kind === 'TITHERS' && registration && action !== 'SKIP') {
      const owner = usedRegistrations.get(registration);
      const self = action === 'UPDATE' ? match?.candidate.id : undefined;
      if (owner && owner !== self) {
        result.warnings.push(`Nº de dizimista ${registration} já usado por outra pessoa da paróquia`);
      }
    }
    if (kind === 'TITHERS' && action === 'UPDATE' && match?.candidate.tither?.registrationNumber && registration &&
      match.candidate.tither.registrationNumber !== registration) {
      result.warnings.push(
        `Nº de dizimista muda de ${match.candidate.tither.registrationNumber} para ${registration}`,
      );
    }

    result.action = action;
    return result;
  }

  /** Limite de membros da faixa (mesma regra do MemberLimitGuard, agora com o total a criar). */
  private async memberLimit(communityId: string, toCreate: number, currentUser: CurrentUser) {
    if (!this.planAccess || currentUser.role === UserRole.SYSTEM_ADMIN || toCreate === 0) return null;
    const mode = this.planAccess.enforcement();
    if (mode === 'off') return null;
    try {
      const status = await this.planAccess.memberLimitStatus(communityId);
      if (!status) return null;
      return {
        maxMembers: status.maxMembers,
        activeMembers: status.activeMembers,
        exceeds: status.activeMembers + toCreate > status.maxMembers,
        enforced: mode === 'on',
      };
    } catch (error) {
      // Cadastro pastoral nunca para por causa da cobrança
      this.logger.error(`Falha ao verificar o limite de membros — liberado: ${error}`);
      return null;
    }
  }

  /** Grava em blocos (uma transação por bloco); bloco que falha vira erro nas suas linhas. */
  private async write(
    parsed: ParsedImportRow[],
    results: ImportRowResult[],
    kind: ImportKind,
    communityId: string,
    candidates: Candidate[],
  ) {
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const work = results
      .map((result, index) => ({ result, row: parsed[index] }))
      .filter(({ result }) => result.status !== 'ERROR' && (result.action === 'CREATE' || result.action === 'UPDATE'));

    for (let start = 0; start < work.length; start += IMPORT_CHUNK_SIZE) {
      const chunk = work.slice(start, start + IMPORT_CHUNK_SIZE);
      try {
        const ids = await this.prisma.$transaction(
          async (tx) => {
            const written: string[] = [];
            for (const { result, row } of chunk) {
              const data = row.data!;
              if (result.action === 'CREATE') {
                const created = await tx.member.create({
                  data: {
                    ...data,
                    communityId,
                    status: MemberStatus.ACTIVE,
                    communityLinks: { create: { communityId, isPrimary: true } },
                  },
                  select: { id: true },
                });
                if (kind === 'TITHERS') {
                  await tx.tither.create({
                    data: {
                      memberId: created.id,
                      registrationNumber: row.tither?.registrationNumber ?? null,
                      ...(row.tither?.joinedAt ? { joinedAt: row.tither.joinedAt } : {}),
                    },
                  });
                }
                written.push(created.id);
                continue;
              }

              const existing = byId.get(result.duplicate!.memberId)!;
              const fill = fillEmptyFields(existing, data);
              if (Object.keys(fill).length) {
                await tx.member.update({ where: { id: existing.id }, data: fill, select: { id: true } });
              }
              if (kind === 'TITHERS') {
                await tx.tither.upsert({
                  where: { memberId: existing.id },
                  create: {
                    memberId: existing.id,
                    registrationNumber: row.tither?.registrationNumber ?? null,
                    ...(row.tither?.joinedAt ? { joinedAt: row.tither.joinedAt } : {}),
                  },
                  update: {
                    status: 'ACTIVE',
                    ...(row.tither?.registrationNumber ? { registrationNumber: row.tither.registrationNumber } : {}),
                  },
                });
              }
              written.push(existing.id);
            }
            return written;
          },
          { timeout: 60_000, maxWait: 10_000 },
        );
        chunk.forEach(({ result }, i) => (result.memberId = ids[i]));
      } catch (error) {
        this.logger.warn(`Importação: bloco de ${chunk.length} linha(s) não gravado: ${error}`);
        for (const { result } of chunk) {
          result.status = 'ERROR';
          result.errors.push('Falha ao gravar — nenhuma linha deste bloco foi gravada; tente de novo');
        }
      }
    }
  }
}

/** "Mesclar": só preenche o que está VAZIO no cadastro (nunca sobrescreve). */
export function fillEmptyFields(existing: Partial<ImportMemberData>, incoming: ImportMemberData) {
  const data: Record<string, unknown> = {};
  for (const field of MEMBER_FIELDS) {
    if (field === 'fullName') continue;
    const current = existing[field];
    const next = incoming[field];
    const isEmpty = current === null || current === undefined || current === '';
    if (isEmpty && next !== null && next !== undefined && next !== '') data[field] = next;
  }
  return data;
}
