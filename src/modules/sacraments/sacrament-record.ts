import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MemberStatus, Prisma, UserRole } from '@prisma/client';
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
