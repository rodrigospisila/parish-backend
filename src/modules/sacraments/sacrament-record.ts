import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MemberStatus, Prisma, SacramentType, UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/hierarchy.service';

/**
 * Regras do ASSENTO sacramental (registro do livro paroquial — cân. 535),
 * comuns ao histórico (/sacraments) e à preparação (/sacrament-processes).
 */

export const SACRAMENT_LABELS: Record<string, string> = {
  BAPTISM: 'Batismo',
  FIRST_COMMUNION: 'Primeira Eucaristia',
  CONFIRMATION: 'Crisma',
  MARRIAGE: 'Matrimônio',
  HOLY_ORDERS: 'Ordem',
  ANOINTING_OF_THE_SICK: 'Unção dos Enfermos',
};

export const LAY_RECORDS_DENIED_MESSAGE = 'Nesta comunidade, só a secretaria paroquial registra sacramentos';
export const RECORD_DELETE_DENIED_MESSAGE = 'Assento sacramental não se apaga. Use a retificação.';
export const RECTIFICATION_REASON_MESSAGE = 'Informe o motivo da retificação';
export const INFORMED_NO_CERTIFICATE_MESSAGE = 'Sacramento informado não gera certidão; registre o assento';
export const RECTIFICATION_REASON_MIN = 10;
export const FINALIDADE_MAX = 120;

/** Sacramentos que imprimem caráter (cân. 845 §1): não se repetem. */
export const UNREPEATABLE_SACRAMENTS: SacramentType[] = [
  SacramentType.BAPTISM,
  SacramentType.CONFIRMATION,
  SacramentType.HOLY_ORDERS,
];

export function isUnrepeatableSacrament(type: SacramentType | string | null | undefined): boolean {
  return !!type && UNREPEATABLE_SACRAMENTS.includes(type as SacramentType);
}

/** 409 de assento duplicado (Batismo/Crisma/Ordem já lavrados para o membro). */
export function duplicateRecordMessage(type: SacramentType | string): string {
  return `Este membro já tem o assento de ${SACRAMENT_LABELS[type] ?? type} — o sacramento não se repete. Confira o histórico sacramental; para corrigir o assento existente, use a retificação.`;
}

/**
 * Advisory lock POR MEMBRO dentro da transação — a MESMA chave do
 * `lockMembers` da catequese e da celebração do processo: serializa todo
 * caminho que grava Sacrament do membro (dedup de sacramento irrepetível).
 */
export async function lockMemberSacraments(tx: { $queryRaw: (...args: any[]) => Promise<unknown> }, memberId: string) {
  // ::text porque o Prisma não deserializa retorno `void`
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'parish:member:' + memberId}))::text`;
}

/**
 * Registro INFORMADO de batismo em outra denominação (gravado pela catequese
 * com place "Outra denominação: X" e notes "Batismo em outra denominação…").
 * Batismo válido não se repete e não vira assento do livro católico.
 */
export function isOtherDenominationRecord(row: { place?: string | null; notes?: string | null }): boolean {
  const place = (row.place ?? '').trim().toLowerCase();
  const notes = (row.notes ?? '').toLowerCase();
  return place.startsWith('outra denominação') || notes.includes('batismo em outra denominação');
}

export const OTHER_DENOMINATION_NOT_RECORD_MESSAGE =
  'Batismo recebido em outra denominação não é assento do livro paroquial: fica como informado. Batismo válido não se repete (cân. 864 e 869); se houver dúvida séria sobre a validade, registre o batismo sob condição pelo processo de preparação.';

/** Registro INFORMADO gerado pela conclusão da etapa na catequese. */
export function isCatechesisCompletionRecord(row: { notes?: string | null }): boolean {
  return (row.notes ?? '').trimStart().startsWith('Concluído na catequese');
}

/** Linha de anotação de retificação gravada no `notes` do assento. */
const RECTIFICATION_LINE = /^Retificação em \d{2}\/\d{2}\/\d{4}: /;

/** Observações: texto aparado; vazio (ou só espaços) é null. */
export function normalizeNotes(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const clean = value.replace(/\r\n?/g, '\n').trim();
  return clean || null;
}

/**
 * As anotações "Retificação em dd/mm/aaaa: …" são a trilha permanente do
 * assento (a auditoria expira): editar as observações NÃO as remove nem
 * forja novas. Linhas de anotação que o texto novo traz e que já existiam
 * ficam onde estão; as que faltarem voltam ao fim; uma "anotação" que não
 * existia é descartada.
 */
export function preserveRectificationNotes(previous: string | null | undefined, next: string | null): string | null {
  const kept = (normalizeNotes(previous) ?? '').split('\n').filter((line) => RECTIFICATION_LINE.test(line));
  if (!kept.length) return next;
  const pending = [...kept];
  const lines: string[] = [];
  for (const line of (next ?? '').split('\n')) {
    if (!RECTIFICATION_LINE.test(line)) {
      lines.push(line);
      continue;
    }
    const index = pending.indexOf(line);
    if (index >= 0) {
      lines.push(line);
      pending.splice(index, 1);
    }
  }
  return normalizeNotes([...lines, ...pending].join('\n'));
}

/** Papéis que sempre registram (o escopo é conferido por quem chama). */
const RECORD_KEEPER_ROLES: UserRole[] = [UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN];

/**
 * Registrar/retificar assento e emitir certidão: administração paroquial ou
 * acima sempre; COMMUNITY_COORDINATOR (leigo) só quando a comunidade do membro
 * liga `laySacramentRecords` (decisão de 19/10/2026). Demais papéis: negado.
 */
export async function assertMayKeepSacramentRecords(
  prisma: { community: { findUnique: (args: any) => Promise<any> } },
  user: CurrentUser,
  communityId: string | null | undefined,
): Promise<void> {
  if (RECORD_KEEPER_ROLES.includes(user?.role)) return;
  if (user?.role === UserRole.COMMUNITY_COORDINATOR && communityId) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: { laySacramentRecords: true },
    });
    if (community?.laySacramentRecords === true) return;
  }
  throw new ForbiddenException(LAY_RECORDS_DENIED_MESSAGE);
}

/** Dados da pessoa como constam no assento. */
export interface SacramentPerson {
  fullName: string;
  birthDate: Date | null;
  fatherName: string | null;
  motherName: string | null;
  /** true quando veio do personSnapshot gravado no assento */
  fromSnapshot: boolean;
}

interface MemberPersonFields {
  fullName?: string | null;
  birthDate?: Date | null;
  fatherName?: string | null;
  motherName?: string | null;
  status?: MemberStatus | string | null;
}

/**
 * Snapshot da pessoa para o assento sobreviver à anonimização LGPD do Member.
 * null quando o cadastro já está anonimizado (gravaria "Usuário Anônimo").
 */
export function buildPersonSnapshot(member: MemberPersonFields | null | undefined, now: Date = new Date()) {
  if (!member || member.status === MemberStatus.ANONYMIZED || !member.fullName) return null;
  return {
    fullName: member.fullName,
    birthDate: member.birthDate ? new Date(member.birthDate).toISOString() : null,
    fatherName: member.fatherName ?? null,
    motherName: member.motherName ?? null,
    capturedAt: now.toISOString(),
  } satisfies Prisma.InputJsonObject;
}

function snapshotText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Lê o personSnapshot gravado (JSON livre) — null quando ausente/ilegível. */
export function readPersonSnapshot(snapshot: unknown): Omit<SacramentPerson, 'fromSnapshot'> | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const raw = snapshot as Record<string, unknown>;
  const fullName = snapshotText(raw.fullName);
  if (!fullName) return null;
  const birth = typeof raw.birthDate === 'string' ? new Date(raw.birthDate) : null;
  return {
    fullName,
    birthDate: birth && !Number.isNaN(birth.getTime()) ? birth : null,
    fatherName: snapshotText(raw.fatherName),
    motherName: snapshotText(raw.motherName),
  };
}

/**
 * Pessoa do assento: o snapshot quando existe (sempre que o cadastro foi
 * anonimizado); senão o cadastro atual. Anonimizado sem snapshot devolve null
 * — não há mais como saber quem é a pessoa pelo sistema.
 */
export function personForRecord(
  member: MemberPersonFields | null | undefined,
  snapshot: unknown,
): SacramentPerson | null {
  const fromSnapshot = readPersonSnapshot(snapshot);
  if (fromSnapshot) return { ...fromSnapshot, fromSnapshot: true };
  if (!member || member.status === MemberStatus.ANONYMIZED || !member.fullName) return null;
  return {
    fullName: member.fullName,
    birthDate: member.birthDate ?? null,
    fatherName: member.fatherName ?? null,
    motherName: member.motherName ?? null,
    fromSnapshot: false,
  };
}

/** `?finalidade=` da certidão: texto livre opcional, até 120 caracteres. */
export function parseFinalidade(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string') throw new BadRequestException('Finalidade inválida — informe um texto');
  const clean = raw.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length > FINALIDADE_MAX) {
    throw new BadRequestException(`A finalidade deve ter no máximo ${FINALIDADE_MAX} caracteres`);
  }
  return clean || null;
}
