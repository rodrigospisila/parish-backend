import {
  ChargeStatus,
  CreateChargeInput,
  CreateSubscriptionInput,
  EnsureCustomerInput,
  FetchLike,
  PaymentProvider,
  PaymentProviderError,
  ProviderCharge,
  ProviderCredentials,
  ProviderSubscription,
  ProviderWebhookEvent,
  WebhookRequest,
} from './payment-provider.interface';
import { safeEqual } from './payment-crypto';

const BASE = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  production: 'https://api.asaas.com/v3',
} as const;

const USER_AGENT = 'Parish/1.0 (dizimo)';

/** Mapeia o status da cobrança Asaas para o status agnóstico. */
export function mapAsaasStatus(status: string | null | undefined, deleted = false): ChargeStatus {
  if (deleted) return 'cancelled';
  switch ((status ?? '').toUpperCase()) {
    case 'PENDING':
    case 'AWAITING_RISK_ANALYSIS':
      return 'pending';
    case 'CONFIRMED':
      return 'confirmed';
    case 'RECEIVED':
    case 'RECEIVED_IN_CASH':
      return 'received';
    case 'OVERDUE':
      return 'overdue';
    case 'REFUNDED':
    case 'REFUND_REQUESTED':
    case 'REFUND_IN_PROGRESS':
    case 'CHARGEBACK_REQUESTED':
    case 'CHARGEBACK_DISPUTE':
    case 'AWAITING_CHARGEBACK_REVERSAL':
      return 'refunded';
    default:
      return 'unknown';
  }
}

/**
 * Asaas — Pix dinâmico (cobrança + QR), webhooks por token (header
 * asaas-access-token), assinatura clássica e Pix Automático (jornada 3).
 * Fatos da doc: https://docs.asaas.com (autenticação via header access_token,
 * User-Agent obrigatório, GET sem body).
 */
export class AsaasProvider implements PaymentProvider {
  readonly name = 'ASAAS' as const;
  private readonly base: string;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {
    this.base = BASE[credentials.env];
  }

  private async request<T>(method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      access_token: this.credentials.apiKey,
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    };
    let payload: string | undefined;
    if (body !== undefined && method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.base}${path}`, { method, headers, body: payload, signal: controller.signal });
    } catch (error) {
      clearTimeout(timer);
      throw new PaymentProviderError(`Asaas indisponível: ${String((error as Error)?.message ?? error)}`);
    }
    clearTimeout(timer);
    const text = await response.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!response.ok) {
      const description = data?.errors?.[0]?.description ?? data?.message ?? `HTTP ${response.status}`;
      throw new PaymentProviderError(`Asaas: ${description}`, response.status, data);
    }
    return data as T;
  }

  async ensureCustomer(input: EnsureCustomerInput): Promise<{ providerCustomerId: string }> {
    const cpfCnpj = (input.cpfCnpj ?? '').replace(/\D/g, '');
    if (!cpfCnpj) throw new PaymentProviderError('Asaas exige CPF/CNPJ do pagador para criar a cobrança');
    // Evita duplicar clientes (a API do Asaas permite duplicidade)
    const found = await this.request<{ data?: Array<{ id: string }> }>('GET', `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`);
    if (found?.data?.length) return { providerCustomerId: found.data[0].id };
    const created = await this.request<{ id: string }>('POST', '/customers', {
      name: input.name.slice(0, 100),
      cpfCnpj,
      email: input.email || undefined,
      mobilePhone: input.phone ? input.phone.replace(/\D/g, '') : undefined,
      externalReference: input.externalRef,
      notificationDisabled: true,
    });
    return { providerCustomerId: created.id };
  }

  private mapCharge(payment: any, qr?: { payload?: string; encodedImage?: string; expirationDate?: string }): ProviderCharge {
    return {
      providerRef: payment.id,
      status: mapAsaasStatus(payment.status, payment.deleted === true),
      qrPayload: qr?.payload ?? null,
      qrImageBase64: qr?.encodedImage ?? null,
      expiresAt: qr?.expirationDate ?? null,
      externalRef: payment.externalReference ?? null,
      value: typeof payment.value === 'number' ? payment.value : null,
      netValue: typeof payment.netValue === 'number' ? payment.netValue : null,
      paidAt: payment.clientPaymentDate ?? payment.paymentDate ?? null,
      subscriptionRef: payment.subscription ?? null,
      dueDate: payment.dueDate ?? null,
      raw: payment,
    };
  }

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    if (!input.providerCustomerId) throw new PaymentProviderError('Cliente Asaas não informado');
    const payment = await this.request<any>('POST', '/payments', {
      customer: input.providerCustomerId,
      billingType: 'PIX',
      value: Math.round(input.amount * 100) / 100,
      dueDate: input.dueDate,
      description: input.description.slice(0, 500),
      externalReference: input.externalRef,
    });
    const qr = await this.request<{ payload: string; encodedImage: string; expirationDate: string }>('GET', `/payments/${payment.id}/pixQrCode`);
    return this.mapCharge(payment, qr);
  }

  async getCharge(providerRef: string): Promise<ProviderCharge> {
    const payment = await this.request<any>('GET', `/payments/${encodeURIComponent(providerRef)}`);
    return this.mapCharge(payment);
  }

  /** QR de uma cobrança já existente (ex.: gerada pela assinatura). */
  async getChargeQr(providerRef: string): Promise<{ payload: string | null; imageBase64: string | null; expiresAt: string | null }> {
    const qr = await this.request<{ payload?: string; encodedImage?: string; expirationDate?: string }>('GET', `/payments/${encodeURIComponent(providerRef)}/pixQrCode`);
    return { payload: qr?.payload ?? null, imageBase64: qr?.encodedImage ?? null, expiresAt: qr?.expirationDate ?? null };
  }

  verifyWebhook(request: WebhookRequest, secret: string): boolean {
    const header = request.headers['asaas-access-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token || !secret) return false;
    return safeEqual(String(token), secret);
  }

  parseWebhook(body: unknown): ProviderWebhookEvent {
    const b = (body ?? {}) as any;
    const eventName = String(b.event ?? '');
    const payment = b.payment ?? null;
    if (eventName.startsWith('PAYMENT_') && payment) {
      return {
        eventId: String(b.id ?? `${payment.id}:${eventName}`),
        eventName,
        kind: 'charge',
        providerRef: payment.id ?? null,
        externalRef: payment.externalReference ?? null,
        status: eventName === 'PAYMENT_DELETED' ? 'cancelled' : mapAsaasStatus(payment.status, payment.deleted === true),
        subscriptionRef: payment.subscription ?? null,
        raw: body,
      };
    }
    if (eventName.startsWith('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_')) {
      const auth = b.pixAutomaticAuthorization ?? {};
      return {
        eventId: String(b.id ?? `${auth.id}:${eventName}`),
        eventName,
        kind: 'authorization',
        authorizationRef: auth.id ?? null,
        authorizationStatus: auth.status ?? eventName.replace('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_', ''),
        subscriptionRef: auth.subscriptionId ?? null,
        raw: body,
      };
    }
    return { eventId: String(b.id ?? `${eventName}:${Date.now()}`), eventName, kind: 'other', raw: body };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    const value = Math.round(input.amount * 100) / 100;
    if (input.mode === 'pix_automatic') {
      // Jornada 3: o QR imediato paga o 1º mês e autoriza os próximos; com
      // SUBSCRIPTION o Asaas cria a assinatura e as cobranças sozinho
      const auth = await this.request<any>('POST', '/pix/automatic/authorizations', {
        frequency: 'MONTHLY',
        customerId: input.providerCustomerId,
        contractId: input.externalRef.replace(/[^A-Za-z0-9]/g, '').slice(0, 35),
        startDate: input.startDate,
        value,
        description: input.description.slice(0, 35),
        immediateQrCode: { originalValue: value, expirationSeconds: 86400, description: input.description.slice(0, 35) },
        paymentCreationMode: 'SUBSCRIPTION',
        retryPolicy: 'ALLOW_THREE_IN_SEVEN_DAYS',
      });
      return {
        providerRef: auth.subscriptionId ?? null,
        authorizationRef: auth.id,
        status: auth.status ?? 'CREATED',
        qrPayload: auth.payload ?? null,
        qrImageBase64: auth.encodedImage ?? null,
        expiresAt: auth.immediateQrCode?.expirationDate ?? null,
        raw: auth,
      };
    }
    const subscription = await this.request<any>('POST', '/subscriptions', {
      customer: input.providerCustomerId,
      billingType: 'PIX',
      value,
      nextDueDate: input.startDate,
      cycle: 'MONTHLY',
      description: input.description.slice(0, 500),
      externalReference: input.externalRef,
    });
    return {
      providerRef: subscription.id,
      authorizationRef: null,
      status: subscription.status ?? 'ACTIVE',
      nextDueDate: subscription.nextDueDate ?? null,
      raw: subscription,
    };
  }

  async cancelSubscription(refs: { providerRef?: string | null; authorizationRef?: string | null }): Promise<void> {
    if (refs.authorizationRef) {
      await this.request('DELETE', `/pix/automatic/authorizations/${encodeURIComponent(refs.authorizationRef)}`);
    }
    if (refs.providerRef) {
      await this.request('DELETE', `/subscriptions/${encodeURIComponent(refs.providerRef)}`);
    }
  }

  async refund(providerRef: string, amount?: number, reason?: string): Promise<{ status: string }> {
    const result = await this.request<any>('POST', `/payments/${encodeURIComponent(providerRef)}/refund`, {
      value: amount !== undefined ? Math.round(amount * 100) / 100 : undefined,
      description: reason?.slice(0, 200),
    });
    return { status: result?.status ?? 'REFUND_REQUESTED' };
  }
}
