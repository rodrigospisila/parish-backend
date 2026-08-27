import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.toUpperCase().replace(/=+$/, '').replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    value = (value << 5) | BASE32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const TOTP_STEP_SECONDS = 30;

export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** TOTP RFC 6238 (SHA-1, 6 dígitos, 30 s) — o mesmo do Google Authenticator/Authy. */
export function totpAt(secretBase32: string, step: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', base32Decode(secretBase32)).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    (((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)) % 10 ** digits;
  return String(code).padStart(digits, '0');
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / TOTP_STEP_SECONDS);
}

/** Verifica o código com tolerância de ±1 intervalo; devolve o intervalo aceito (anti-replay) ou null. */
export function verifyTotp(secretBase32: string, code: string, opts: { window?: number; now?: number; lastStep?: number | null } = {}): number | null {
  const digits = String(code ?? '').replace(/\D/g, '');
  if (digits.length !== 6) return null;
  const step = currentStep(opts.now);
  const window = opts.window ?? 1;
  for (let i = -window; i <= window; i += 1) {
    const candidate = step + i;
    if (opts.lastStep != null && candidate <= opts.lastStep) continue;
    const expected = totpAt(secretBase32, candidate);
    if (expected.length === digits.length && timingSafeEqual(Buffer.from(expected), Buffer.from(digits))) return candidate;
  }
  return null;
}

export function otpauthUrl(issuer: string, account: string, secretBase32: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${TOTP_STEP_SECONDS}`;
}
