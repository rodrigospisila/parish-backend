/**
 * Adaptador agnóstico de provedor de pagamento (Dízimo D3).
 * Cada provedor (Asaas, Mercado Pago) implementa esta interface; o domínio do
 * dízimo só conhece estes tipos — trocar de provedor não muda o fluxo do fiel.
 */

export type ProviderName = 'ASAAS' | 'MERCADOPAGO';

export type ChargeStatus =
  | 'pending'
  | 'confirmed' // pago, saldo ainda não disponível (Asaas CONFIRMED)
  | 'received' // pago e disponível
  | 'overdue'
  | 'refunded'
  | 'cancelled'
  | 'unknown';

export const PAID_STATUSES: ReadonlySet<ChargeStatus> = new Set(['confirmed', 'received']);

export interface ProviderCredentials {
  apiKey: string;
  env: 'sandbox' | 'production';
  /** Segredo para validar webhooks (Asaas: authToken; MP: chave secreta da aplicação) */
  webhookSecret?: string | null;
}

export interface ProviderCharge {
  providerRef: string;
  status: ChargeStatus;
  /** Pix copia e cola gerado pelo provedor */
  qrPayload?: string | null;
  /** PNG em base64 (sem prefixo data:) */
  qrImageBase64?: string | null;
  expiresAt?: string | null;
  externalRef?: string | null;
  value?: number | null;
  netValue?: number | null;
  paidAt?: string | null;
  /** Assinatura de origem (cobrança gerada por recorrência) */
  subscriptionRef?: string | null;
  dueDate?: string | null;
  raw?: unknown;
}

export interface ProviderWebhookEvent {
  /** Identificador do evento no provedor (dedupe) */
  eventId: string;
  eventName: string;
  kind: 'charge' | 'authorization' | 'other';
  providerRef?: string | null;
  externalRef?: string | null;
  status?: ChargeStatus;
  subscriptionRef?: string | null;
  authorizationRef?: string | null;
  authorizationStatus?: string | null;
  raw: unknown;
}

export interface ProviderSubscription {
  /** Assinatura (Asaas sub_…) quando existir */
  providerRef?: string | null;
  /** Autorização de Pix Automático (Asaas) quando existir */
  authorizationRef?: string | null;
  status: string;
  /** QR de autorização/primeiro pagamento (Pix Automático) */
  qrPayload?: string | null;
  qrImageBase64?: string | null;
  expiresAt?: string | null;
  nextDueDate?: string | null;
  raw?: unknown;
}

export interface EnsureCustomerInput {
  cpfCnpj?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  externalRef: string;
}

export interface CreateChargeInput {
  providerCustomerId?: string | null;
  amount: number;
  /** AAAA-MM-DD */
  dueDate: string;
  description: string;
  externalRef: string;
  idempotencyKey: string;
  payerEmail?: string | null;
  payerCpf?: string | null;
  /** Segundos até expirar (quando o provedor aceita) */
  expiresInSec?: number;
}

export interface CreateSubscriptionInput {
  providerCustomerId: string;
  amount: number;
  cycle: 'MONTHLY';
  /** AAAA-MM-DD */
  startDate: string;
  description: string;
  externalRef: string;
  mode: 'pix_subscription' | 'pix_automatic';
}

export interface WebhookRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: Buffer;
  query?: Record<string, string | undefined>;
}

export interface PaymentProvider {
  readonly name: ProviderName;
  ensureCustomer(input: EnsureCustomerInput): Promise<{ providerCustomerId: string }>;
  createCharge(input: CreateChargeInput): Promise<ProviderCharge>;
  getCharge(providerRef: string): Promise<ProviderCharge>;
  verifyWebhook(request: WebhookRequest, secret: string): boolean;
  parseWebhook(body: unknown): ProviderWebhookEvent;
  createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription>;
  cancelSubscription(refs: { providerRef?: string | null; authorizationRef?: string | null }): Promise<void>;
  refund(providerRef: string, amount?: number, reason?: string): Promise<{ status: string }>;
}

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
