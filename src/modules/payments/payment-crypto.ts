import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Segredos de provedor (API key da paróquia) em repouso: AES-256-GCM com a
 * chave do ambiente PAYMENTS_ENCRYPTION_KEY (32 bytes em hex ou base64).
 * Sem a chave, nenhum provedor pode ser configurado — falha explícita.
 */
const ALG = 'aes-256-gcm';

function loadKey(): Buffer {
  const raw = (process.env.PAYMENTS_ENCRYPTION_KEY ?? '').trim();
  if (!raw) {
    throw new Error('PAYMENTS_ENCRYPTION_KEY não configurada — gere 32 bytes (openssl rand -hex 32) e defina no ambiente');
  }
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('PAYMENTS_ENCRYPTION_KEY inválida — precisa ter exatamente 32 bytes (hex de 64 caracteres)');
  }
  return key;
}

/** Motivo pelo qual a criptografia não está pronta (null quando está). */
export function paymentsCryptoProblem(): string | null {
  try {
    loadKey();
    return null;
  } catch (error) {
    return String((error as Error)?.message ?? error);
  }
}

export function isPaymentsCryptoConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/** Retorna "v1:<iv>:<tag>:<cipher>" em base64. */
export function encryptSecret(plain: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  const key = loadKey();
  const [version, ivB64, tagB64, dataB64] = payload.split(':');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Segredo cifrado em formato inválido');
  const decipher = createDecipheriv(ALG, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Token opaco para autenticar webhooks (Asaas exige 32–255 caracteres). */
export function generateWebhookToken(): string {
  return randomBytes(32).toString('hex'); // 64 chars
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Máscara para exibição: mantém 4 primeiros e 4 últimos caracteres. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 2)}…`;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
