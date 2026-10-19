import { createHmac, randomInt, timingSafeEqual } from 'crypto';

/**
 * Código de verificação da reivindicação (C1 — saas-implantacao-02).
 * Vai para o contato OFICIAL da paróquia (Parish.phone/email do território),
 * nunca para o contato informado por quem pede. Confirmar o código só marca o
 * pedido como VERIFIED (evidência); quem aprova é sempre o SYSTEM_ADMIN.
 */

export const CLAIM_CODE_TTL_MS = 30 * 60 * 1000;
/** Envios por pedido */
export const CLAIM_CODE_MAX_SENDS = 3;
/** Envios ao mesmo contato oficial (somando todos os pedidos da paróquia) em 24 h — anti-inundação */
export const CLAIM_CODE_MAX_SENDS_PER_PARISH_24H = 6;
/** Tentativas de conferência por pedido (somando todos os códigos enviados) */
export const CLAIM_CODE_MAX_ATTEMPTS = 5;

/** 6 dígitos (zeros à esquerda contam), de fonte criptográfica. */
export const generateClaimCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * HMAC-SHA256 do código, amarrado ao pedido (o mesmo código em outro pedido
 * dá outro hash). Chave do servidor: AUDIT_PSEUDONYM_KEY ou JWT_SECRET.
 */
export const hashClaimCode = (secret: string, claimId: string, code: string): string =>
  createHmac('sha256', secret)
    .update(`parish-claim:${claimId}:${String(code).trim()}`)
    .digest('hex');

/** Comparação em tempo constante (hashes hex do mesmo tamanho). */
export const claimCodeMatches = (secret: string, claimId: string, code: string, storedHash: string | null): boolean => {
  if (!storedHash || !/^\d{6}$/.test(String(code ?? '').trim())) return false;
  const expected = Buffer.from(hashClaimCode(secret, claimId, code), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return expected.length === stored.length && timingSafeEqual(expected, stored);
};

export const isClaimCodeExpired = (sentAt: Date | null, now: Date = new Date()): boolean =>
  !sentAt || now.getTime() - sentAt.getTime() > CLAIM_CODE_TTL_MS;

/**
 * Celular brasileiro (aceita SMS): DDD + 9 dígitos começando por 9. O
 * telefone fixo da secretaria não recebe SMS — aí só o e-mail oficial ou a
 * revisão manual.
 */
export const isBrazilianMobile = (e164: string | null | undefined): boolean => {
  const digits = String(e164 ?? '').replace(/\D/g, '');
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return local.length === 11 && local[2] === '9';
};

/** E-mail com cara de e-mail (o território tem cadastros sujos). */
export const looksLikeEmail = (value: string | null | undefined): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());
