import { createHash, timingSafeEqual } from 'crypto';
import { AsaasProvider, NfseSettings } from './asaas.provider';
import { FetchLike } from './payment-provider.interface';

/**
 * Fábrica do provedor da PLATAFORMA (Onda 1, C3): a assinatura do Parish é
 * cobrada na conta Asaas da empresa, separada das contas das paróquias (o
 * dízimo continua com `PaymentsService.forParish`, chave cifrada por paróquia).
 *
 * Envs (lidas a cada chamada — trocar + reiniciar basta):
 * - PLATFORM_ASAAS_API_KEY        chave de API da conta da empresa
 * - PLATFORM_ASAAS_ENV            sandbox (padrão) | production
 * - PLATFORM_ASAAS_WEBHOOK_TOKEN  token que o Asaas envia no header asaas-access-token
 * - PLATFORM_NFSE_*               NFS-e automática (ver readPlatformNfseSettings)
 */

/**
 * Provider gravado em PaymentWebhookEvent para a conta da EMPRESA (o dízimo
 * usa ASAAS/MERCADOPAGO). O reprocessador do dízimo ignora esses registros.
 */
export const PLATFORM_WEBHOOK_PROVIDER = 'ASAAS_PLATFORM';

export type EnvLike = Record<string, string | undefined>;

export interface PlatformAsaasConfig {
  apiKey: string;
  env: 'sandbox' | 'production';
  webhookToken: string | null;
}

function clean(value: string | undefined | null): string {
  return String(value ?? '').trim();
}

/** Conta da plataforma configurada (chave de API presente); null sem ela. */
export function readPlatformAsaasConfig(env: EnvLike = process.env): PlatformAsaasConfig | null {
  const apiKey = clean(env.PLATFORM_ASAAS_API_KEY);
  if (!apiKey) return null;
  return {
    apiKey,
    env: clean(env.PLATFORM_ASAAS_ENV).toLowerCase() === 'production' ? 'production' : 'sandbox',
    webhookToken: clean(env.PLATFORM_ASAAS_WEBHOOK_TOKEN) || null,
  };
}

/**
 * Por que a contratação online está indisponível (null = disponível). Sem o
 * token do webhook a cobrança sairia, mas o pagamento nunca ativaria o plano —
 * por isso as duas envs são exigidas.
 */
export function platformCheckoutProblem(env: EnvLike = process.env): string | null {
  if (!clean(env.PLATFORM_ASAAS_API_KEY)) return 'PLATFORM_ASAAS_API_KEY não configurada';
  if (!clean(env.PLATFORM_ASAAS_WEBHOOK_TOKEN)) return 'PLATFORM_ASAAS_WEBHOOK_TOKEN não configurado';
  return null;
}

export function createPlatformAsaasProvider(config: PlatformAsaasConfig, fetchImpl?: FetchLike): AsaasProvider {
  return new AsaasProvider({ apiKey: config.apiKey, env: config.env, webhookSecret: config.webhookToken }, fetchImpl);
}

/**
 * Comparação do token em tempo constante, inclusive no tamanho (compara os
 * hashes SHA-256, que têm sempre 32 bytes).
 */
export function platformTokenMatches(received: string | string[] | undefined | null, expected: string | null | undefined): boolean {
  const value = Array.isArray(received) ? received[0] : received;
  if (!value || !expected) return false;
  const a = createHash('sha256').update(String(value)).digest();
  const b = createHash('sha256').update(String(expected)).digest();
  return timingSafeEqual(a, b);
}

function num(value: string | undefined): number | undefined {
  const v = clean(value).replace(',', '.');
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const NFSE_PERIODS = new Set([
  'ON_PAYMENT_CONFIRMATION',
  'ON_PAYMENT_DUE_DATE',
  'BEFORE_PAYMENT_DUE_DATE',
  'ON_DUE_DATE_MONTH',
  'ON_NEXT_MONTH',
]);

/**
 * NFS-e automática da assinatura (POST /subscriptions/{id}/invoiceSettings).
 * Ligada só com PLATFORM_NFSE_SERVICE_NAME e (PLATFORM_NFSE_SERVICE_ID ou
 * PLATFORM_NFSE_SERVICE_CODE). Alíquotas em %, padrão 0 (definir com o contador):
 * PLATFORM_NFSE_ISS, PLATFORM_NFSE_RETAIN_ISS (true|false), PLATFORM_NFSE_COFINS,
 * PLATFORM_NFSE_CSLL, PLATFORM_NFSE_INSS, PLATFORM_NFSE_IR, PLATFORM_NFSE_PIS,
 * PLATFORM_NFSE_OBSERVATIONS, PLATFORM_NFSE_EFFECTIVE (padrão ON_PAYMENT_CONFIRMATION).
 */
export function readPlatformNfseSettings(env: EnvLike = process.env): NfseSettings | null {
  const name = clean(env.PLATFORM_NFSE_SERVICE_NAME);
  const id = clean(env.PLATFORM_NFSE_SERVICE_ID);
  const code = clean(env.PLATFORM_NFSE_SERVICE_CODE);
  if (!name || (!id && !code)) return null;
  const effective = clean(env.PLATFORM_NFSE_EFFECTIVE).toUpperCase();
  return {
    municipalServiceId: id || null,
    municipalServiceCode: code || null,
    municipalServiceName: name,
    observations: clean(env.PLATFORM_NFSE_OBSERVATIONS) || null,
    effectiveDatePeriod: (NFSE_PERIODS.has(effective) ? effective : 'ON_PAYMENT_CONFIRMATION') as NfseSettings['effectiveDatePeriod'],
    retainIss: clean(env.PLATFORM_NFSE_RETAIN_ISS).toLowerCase() === 'true',
    iss: num(env.PLATFORM_NFSE_ISS) ?? 0,
    cofins: num(env.PLATFORM_NFSE_COFINS) ?? 0,
    csll: num(env.PLATFORM_NFSE_CSLL) ?? 0,
    inss: num(env.PLATFORM_NFSE_INSS) ?? 0,
    ir: num(env.PLATFORM_NFSE_IR) ?? 0,
    pis: num(env.PLATFORM_NFSE_PIS) ?? 0,
  };
}
