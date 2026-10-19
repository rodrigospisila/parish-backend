import { createHash, randomBytes } from 'crypto';
import { UserRole } from '@prisma/client';
import { maskEmail, maskPhone } from '../messaging/log-mask';

/**
 * Peças puras do convite de equipe (C2 — saas-implantacao-10 / ux-acesso-05).
 *
 * - Token: 32 bytes aleatórios em base64url, entregue UMA vez (link). O banco
 *   guarda só o SHA-256 (um dump não vira convite válido).
 * - Uso único: o aceite consome o convite com gravação condicional
 *   (acceptedAt nulo, não revogado, não vencido).
 * - Validade: 7 dias a partir do envio (reenviar gera token e prazo novos).
 */

export const INVITE_TTL_DAYS = 7;
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 3600 * 1000;
export const DEFAULT_PUBLIC_WEB_URL = 'https://parish-web-three.vercel.app';

/**
 * Convite de TITULAR (eng-acessos-03): coluna `UserInvite.holder`. Só vale
 * com PARISH_ADMIN e paróquia — um registro fora disso não vira titular.
 */
export const isHolderInvite = (invite: {
  holder?: boolean | null;
  role?: UserRole;
  parishId?: string | null;
}): boolean =>
  invite.holder === true &&
  (invite.role === undefined || invite.role === UserRole.PARISH_ADMIN) &&
  (invite.parishId === undefined || !!invite.parishId);

export const generateInviteToken = (): string => randomBytes(32).toString('base64url');

export const hashInviteToken = (token: string): string => createHash('sha256').update(String(token)).digest('hex');

/** Formato do token (43 caracteres base64url): o que não casa nem chega ao banco. */
export const isWellFormedInviteToken = (token: unknown): token is string =>
  typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);

export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
export const INVITE_STATUSES: InviteStatus[] = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'];

export const inviteStatus = (
  invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
): InviteStatus => {
  if (invite.acceptedAt) return 'ACCEPTED';
  if (invite.revokedAt) return 'REVOKED';
  if (invite.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'PENDING';
};

/** `where` do Prisma para cada situação do convite. */
export const inviteStatusWhere = (status: InviteStatus, now: Date = new Date()) => {
  switch (status) {
    case 'ACCEPTED':
      return { acceptedAt: { not: null } };
    case 'REVOKED':
      return { acceptedAt: null, revokedAt: { not: null } };
    case 'EXPIRED':
      return { acceptedAt: null, revokedAt: null, expiresAt: { lte: now } };
    case 'PENDING':
    default:
      return { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } };
  }
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'Administrador(a) do sistema',
  DIOCESAN_ADMIN: 'Administrador(a) diocesano(a)',
  PARISH_ADMIN: 'Administrador(a) paroquial',
  COMMUNITY_COORDINATOR: 'Coordenador(a) de comunidade',
  PASTORAL_COORDINATOR: 'Coordenador(a) de pastoral',
  VOLUNTEER: 'Voluntário(a)',
  FAITHFUL: 'Membro da comunidade',
};

export const HOLDER_ROLE_LABEL = 'Administrador(a) paroquial titular';

export const inviteRoleLabel = (role: UserRole, holder = false): string =>
  holder && role === UserRole.PARISH_ADMIN ? HOLDER_ROLE_LABEL : (ROLE_LABELS[role] ?? String(role));

/** Base pública do painel (env PUBLIC_WEB_URL), sem barra no fim. */
export const publicWebBase = (raw: string | null | undefined): string =>
  (String(raw ?? '').trim() || DEFAULT_PUBLIC_WEB_URL).replace(/\/+$/, '');

export const inviteUrl = (base: string, token: string): string => `${publicWebBase(base)}/convite/${token}`;

/**
 * Texto pronto para o WhatsApp (sem emoji):
 * "<Nome>, a <Paróquia> convidou você para a equipe no Parish como <papel>. Crie seu acesso: <url>"
 */
export const inviteWhatsappText = (params: {
  name?: string | null;
  orgName?: string | null;
  role: UserRole;
  holder?: boolean;
  url: string;
}): string => {
  const firstName = String(params.name ?? '').trim();
  const org = String(params.orgName ?? '').trim();
  const label = inviteRoleLabel(params.role, params.holder);
  const role = label.charAt(0).toLowerCase() + label.slice(1);
  const who = org ? `a ${org}` : 'a equipe da sua paróquia';
  const opening = firstName ? `${firstName}, ${who}` : `Olá! ${who.charAt(0).toUpperCase()}${who.slice(1)}`;
  return `${opening} convidou você para a equipe no Parish como ${role}. Crie seu acesso: ${params.url}`;
};

/**
 * E-mail técnico de quem aceitou o convite só com celular (User.email é
 * obrigatório e único no modelo). Padrão reconhecível e domínio NÃO roteável
 * (.invalid, RFC 2606): `tel-<dígitos E.164 sem +>@sem-email.parish.invalid`.
 * O app/painel escondem esse e-mail; a pessoa troca por um real no perfil.
 */
export const TECHNICAL_EMAIL_DOMAIN = 'sem-email.parish.invalid';

export const technicalEmailForPhone = (e164Phone: string): string =>
  `tel-${String(e164Phone).replace(/\D/g, '')}@${TECHNICAL_EMAIL_DOMAIN}`;

export const isTechnicalEmail = (email: string | null | undefined): boolean =>
  String(email ?? '')
    .toLowerCase()
    .endsWith(`@${TECHNICAL_EMAIL_DOMAIN}`);

export const maskInviteEmail = (email: string | null | undefined): string | null =>
  email && !isTechnicalEmail(email) ? maskEmail(email) : null;

export const maskInvitePhone = (phone: string | null | undefined): string | null => (phone ? maskPhone(phone) : null);
