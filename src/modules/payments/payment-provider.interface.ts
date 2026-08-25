/**
 * Adaptador agnóstico de provedor de pagamento (Dízimo D3).
 * Cada provedor (Asaas, Mercado Pago) implementa esta interface; o domínio do
 * dízimo só conhece estes tipos — trocar de provedor não muda o fluxo do fiel.
 */

export type ProviderName = 'ASAAS' | 'MERCADOPAGO';

/** Meio de pagamento escolhido pelo fiel (cartão/boleto só onde o provedor tem página hospedada). */
export type PaymentMethod = 'PIX' | 'CARD' | 'BOLETO';

export type ChargeStatus =
  | 'pending'
  | 'confirmed' // pago, saldo ainda não disponível (Asaas CONFIRMED)
  | 'received' // pago e disponível
  | 'overdue'
  | 'in_review' // cartão em análise de risco no provedor
  | 'disputed' // estorno/chargeback em andamento (ainda não definitivo)
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
  /** Meio da cobrança no provedor (quando informado) */
  method?: PaymentMethod | null;
  /** Página de pagamento hospedada (cartão/boleto) */
  paymentUrl?: string | null;
  /** PDF do boleto e linha digitável */
  boletoUrl?: string | null;
  boletoLine?: string | null;
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
  /** Cliente no provedor (casa a cobrança com o membro quando a assinatura ainda não é conhecida) */
  customerRef?: string | null;
  dueDate?: string | null;
  raw?: unknown;
}

export interface ProviderSetupInput {
  webhookUrl: string;
  webhookToken: string;
  /** E-mail que o provedor avisa quando o webhook falha */
  contactEmail: string;
}

export interface ProviderSetupResult {
  /** Conta com chave Pix ativa (sem ela o provedor não emite QR) */
  pixKeyReady: boolean;
  pixKey?: string | null;
  /** Webhook apontando para o Parish, com o token atual */
  webhookRegistered: boolean;
  webhookId?: string | null;
  notes: string[];
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
  /** Cobrança ligada ao evento de autorização (1º pagamento do Pix Automático) */
  paymentId?: string | null;
  raw: unknown;
}

export interface ProviderAuthorization {
  authorizationRef: string;
  status: string;
  subscriptionRef?: string | null;
  raw?: unknown;
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
  /** Cobrança do QR imediato (Pix Automático), quando o provedor informa */
  firstPaymentRef?: string | null;
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
  /** PIX (padrão), CARD ou BOLETO */
  method?: PaymentMethod;
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
  /** Cancela uma cobrança ainda não paga (o QR deixa de aceitar pagamento). Tolera "já cancelada". */
  cancelCharge(providerRef: string): Promise<void>;
  /** Estado atual de uma autorização de recorrência (quando o provedor tem o conceito). */
  getAuthorization?(authorizationRef: string): Promise<ProviderAuthorization>;
  /** Prepara a conta do provedor para o Parish (chave Pix, webhook) — idempotente. */
  ensureSetup?(input: ProviderSetupInput): Promise<ProviderSetupResult>;
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
