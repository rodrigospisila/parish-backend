import {
  ChargeStatus,
  CreateChargeInput,
  CreateSubscriptionInput,
  EnsureCustomerInput,
  FetchLike,
  PaymentProvider,
  PaymentMethod,
  PaymentProviderError,
  ProviderAuthorization,
  ProviderCharge,
  ProviderCredentials,
  ProviderSetupInput,
  ProviderSetupResult,
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

  private async request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
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

  private static methodFromBillingType(billingType: string | null | undefined): PaymentMethod | null {
    switch ((billingType ?? '').toUpperCase()) {
      case 'PIX':
        return 'PIX';
      case 'CREDIT_CARD':
      case 'DEBIT_CARD':
        return 'CARD';
      case 'BOLETO':
        return 'BOLETO';
      default:
        return null;
    }
  }

  private mapCharge(
    payment: any,
    qr?: { payload?: string; encodedImage?: string; expirationDate?: string },
    boletoLine?: string | null,
  ): ProviderCharge {
    return {
      providerRef: payment.id,
      status: mapAsaasStatus(payment.status, payment.deleted === true),
      method: AsaasProvider.methodFromBillingType(payment.billingType),
      paymentUrl: payment.invoiceUrl ?? null,
      boletoUrl: payment.bankSlipUrl ?? null,
      boletoLine: boletoLine ?? null,
      qrPayload: qr?.payload ?? null,
      qrImageBase64: qr?.encodedImage ?? null,
      expiresAt: qr?.expirationDate ?? null,
      externalRef: payment.externalReference ?? null,
      value: typeof payment.value === 'number' ? payment.value : null,
      netValue: typeof payment.netValue === 'number' ? payment.netValue : null,
      paidAt: payment.clientPaymentDate ?? payment.paymentDate ?? null,
      subscriptionRef: payment.subscription ?? null,
      customerRef: payment.customer ?? null,
      dueDate: payment.dueDate ?? null,
      raw: payment,
    };
  }

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    if (!input.providerCustomerId) throw new PaymentProviderError('Cliente Asaas não informado');
    const method: PaymentMethod = input.method ?? 'PIX';
    // Cartão sem dados do cartão: o Asaas devolve a página hospedada (invoiceUrl)
    // onde o pagador digita o cartão — o Parish nunca vê o número
    const billingType = method === 'CARD' ? 'CREDIT_CARD' : method === 'BOLETO' ? 'BOLETO' : 'PIX';
    const payment = await this.request<any>('POST', '/payments', {
      customer: input.providerCustomerId,
      billingType,
      value: Math.round(input.amount * 100) / 100,
      dueDate: input.dueDate,
      description: input.description.slice(0, 500),
      externalReference: input.externalRef,
    });
    if (method === 'PIX') {
      const qr = await this.request<{ payload: string; encodedImage: string; expirationDate: string }>('GET', `/payments/${payment.id}/pixQrCode`);
      return this.mapCharge(payment, qr);
    }
    if (method === 'BOLETO') {
      let line: string | null = null;
      try {
        const field = await this.request<{ identificationField?: string }>('GET', `/payments/${payment.id}/identificationField`);
        line = field?.identificationField ?? null;
      } catch {
        line = null; // o PDF/página continuam disponíveis
      }
      return this.mapCharge(payment, undefined, line);
    }
    return this.mapCharge(payment);
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
      // Doc "Eventos para Pix Automático": objeto em `authorization`; a página de
      // fluxos de webhook traz `pixAutomaticAuthorization` como string (id) com
      // `paymentId` ao lado. Aceita as duas formas.
      const raw = b.authorization ?? b.pixAutomaticAuthorization ?? null;
      const auth: any = typeof raw === 'string' ? { id: raw } : (raw ?? {});
      const authorizationRef: string | null = auth.id ?? null;
      const paymentId: string | null = b.paymentId ?? b.payment?.id ?? auth.paymentId ?? auth.immediateQrCode?.paymentId ?? null;
      return {
        eventId: String(b.id ?? (authorizationRef ? `${authorizationRef}:${eventName}:${paymentId ?? ''}` : `${eventName}:${Date.now()}`)),
        eventName,
        kind: 'authorization',
        authorizationRef,
        authorizationStatus: auth.status ?? eventName.replace('PIX_AUTOMATIC_RECURRING_AUTHORIZATION_', ''),
        subscriptionRef: auth.subscriptionId ?? auth.subscription?.id ?? (typeof auth.subscription === 'string' ? auth.subscription : null),
        paymentId,
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
        qrPayload: auth.payload ?? auth.immediateQrCode?.payload ?? null,
        qrImageBase64: auth.encodedImage ?? auth.immediateQrCode?.encodedImage ?? null,
        // O sandbox não devolve a validade do QR imediato: assume os 24h pedidos
        expiresAt: auth.immediateQrCode?.expirationDate ?? new Date(Date.now() + 86400 * 1000).toISOString(),
        firstPaymentRef: auth.immediateQrCode?.paymentId ?? auth.paymentId ?? null,
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

  /** DELETE idempotente: "não encontrado" significa que já não existe/cobra — objetivo atingido. */
  private async deleteTolerant(path: string): Promise<void> {
    try {
      await this.request('DELETE', path);
    } catch (error) {
      if (error instanceof PaymentProviderError && error.status === 404) return;
      throw error;
    }
  }

  async cancelSubscription(refs: { providerRef?: string | null; authorizationRef?: string | null }): Promise<void> {
    if (refs.authorizationRef) {
      await this.deleteTolerant(`/pix/automatic/authorizations/${encodeURIComponent(refs.authorizationRef)}`);
    }
    if (refs.providerRef) {
      await this.deleteTolerant(`/subscriptions/${encodeURIComponent(refs.providerRef)}`);
    }
  }

  async cancelCharge(providerRef: string): Promise<void> {
    await this.deleteTolerant(`/payments/${encodeURIComponent(providerRef)}`);
  }

  /** GET /pix/automatic/authorizations/{id} — estado real da autorização (e a assinatura criada na ativação). */
  async getAuthorization(authorizationRef: string): Promise<ProviderAuthorization> {
    const auth = await this.request<any>('GET', `/pix/automatic/authorizations/${encodeURIComponent(authorizationRef)}`);
    return {
      authorizationRef: auth?.id ?? authorizationRef,
      status: String(auth?.status ?? ''),
      subscriptionRef: auth?.subscriptionId ?? auth?.subscription?.id ?? (typeof auth?.subscription === 'string' ? auth.subscription : null),
      raw: auth,
    };
  }

  /** Eventos que o Parish precisa receber. */
  static readonly WEBHOOK_EVENTS = [
    'PAYMENT_CREATED',
    'PAYMENT_UPDATED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'PAYMENT_DELETED',
    'PAYMENT_REFUNDED',
    'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CREATED',
    'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED',
    'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED',
    'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_EXPIRED',
    'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_REFUSED',
  ];

  /**
   * Deixa a conta pronta para o Parish (idempotente): sem chave Pix ativa o
   * Asaas responde "Chave Pix não encontrada" ao gerar QR; o webhook é
   * cadastrado/atualizado com a URL da paróquia e o token atual.
   */
  async ensureSetup(input: ProviderSetupInput): Promise<ProviderSetupResult> {
    const notes: string[] = [];
    // 1) chave Pix (aleatória/EVP)
    let pixKey: string | null = null;
    let pixKeyReady = false;
    try {
      const keys = await this.request<{ data?: Array<{ key?: string; status?: string }> }>('GET', '/pix/addressKeys?limit=20');
      const active = (keys?.data ?? []).find((k) => k.status === 'ACTIVE');
      if (active) {
        pixKey = active.key ?? null;
        pixKeyReady = true;
      } else {
        const pending = (keys?.data ?? []).find((k) => k.status === 'AWAITING_ACTIVATION' || k.status === 'AWAITING_ACCOUNT_DELETION');
        if (!pending) {
          const created = await this.request<{ key?: string; status?: string }>('POST', '/pix/addressKeys', { type: 'EVP' });
          pixKey = created?.key ?? null;
          pixKeyReady = created?.status === 'ACTIVE';
          notes.push(pixKeyReady ? 'Chave Pix aleatória criada na conta Asaas' : 'Chave Pix aleatória solicitada — o Asaas ativa em instantes');
        } else {
          pixKey = pending.key ?? null;
          notes.push('Chave Pix ainda em ativação no Asaas');
        }
      }
    } catch (error) {
      notes.push(`Chave Pix: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
    // 2) webhook
    let webhookRegistered = false;
    let webhookId: string | null = null;
    try {
      const list = await this.request<{ data?: Array<{ id: string; url?: string }> }>('GET', '/webhooks?limit=50');
      const existing = (list?.data ?? []).find((w) => w.url === input.webhookUrl);
      const body = {
        name: 'Parish — dízimo',
        url: input.webhookUrl,
        email: input.contactEmail,
        enabled: true,
        interrupted: false,
        apiVersion: 3,
        authToken: input.webhookToken,
        sendType: 'SEQUENTIALLY',
        events: AsaasProvider.WEBHOOK_EVENTS,
      };
      const saved = existing
        ? await this.request<{ id: string }>('PUT', `/webhooks/${encodeURIComponent(existing.id)}`, body)
        : await this.request<{ id: string }>('POST', '/webhooks', body);
      webhookId = saved?.id ?? existing?.id ?? null;
      webhookRegistered = !!webhookId;
      notes.push(existing ? 'Webhook do Asaas atualizado com o token atual' : 'Webhook cadastrado no Asaas');
    } catch (error) {
      notes.push(`Webhook: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
    return { pixKeyReady, pixKey, webhookRegistered, webhookId, notes };
  }

  async refund(providerRef: string, amount?: number, reason?: string): Promise<{ status: string }> {
    const result = await this.request<any>('POST', `/payments/${encodeURIComponent(providerRef)}/refund`, {
      value: amount !== undefined ? Math.round(amount * 100) / 100 : undefined,
      description: reason?.slice(0, 200),
    });
    return { status: result?.status ?? 'REFUND_REQUESTED' };
  }
}
