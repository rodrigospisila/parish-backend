import { createHmac } from 'crypto';
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

const BASE = 'https://api.mercadopago.com';

export function mapMercadoPagoStatus(status: string | null | undefined): ChargeStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pending';
    case 'approved':
      return 'received';
    case 'cancelled':
    case 'rejected':
      return 'cancelled';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    default:
      return 'unknown';
  }
}

/** Data de expiração no formato que o Mercado Pago aceita (com offset -03:00). */
export function mercadoPagoExpiration(seconds: number): string {
  const at = new Date(Date.now() + seconds * 1000);
  const brt = new Date(at.getTime() - 3 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}.000-03:00`;
}

/**
 * Mercado Pago — Checkout API (Pix avulso) + webhook assinado (x-signature).
 * Recorrência via API é só cartão (preapproval) e Pix Automático não é
 * documentado: este provedor cobre cobrança avulsa; assinatura não suportada.
 */
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = 'MERCADOPAGO' as const;

  constructor(
    private readonly credentials: ProviderCredentials,
    private readonly fetchImpl: FetchLike = (input, init) => fetch(input, init),
  ) {}

  private async request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.credentials.apiKey}`,
      Accept: 'application/json',
      ...extraHeaders,
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
      response = await this.fetchImpl(`${BASE}${path}`, { method, headers, body: payload, signal: controller.signal });
    } catch (error) {
      clearTimeout(timer);
      throw new PaymentProviderError(`Mercado Pago indisponível: ${String((error as Error)?.message ?? error)}`);
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
      const description = data?.message ?? data?.cause?.[0]?.description ?? `HTTP ${response.status}`;
      throw new PaymentProviderError(`Mercado Pago: ${description}`, response.status, data);
    }
    return data as T;
  }

  async ensureCustomer(input: EnsureCustomerInput): Promise<{ providerCustomerId: string }> {
    // O pagamento Pix do MP identifica o pagador no próprio pagamento (email/CPF);
    // não precisa de cadastro prévio — devolvemos a referência do membro
    return { providerCustomerId: input.externalRef };
  }

  private mapCharge(payment: any): ProviderCharge {
    const tx = payment?.point_of_interaction?.transaction_data ?? {};
    return {
      providerRef: String(payment.id),
      status: mapMercadoPagoStatus(payment.status),
      qrPayload: tx.qr_code ?? null,
      qrImageBase64: tx.qr_code_base64 ?? null,
      expiresAt: payment.date_of_expiration ?? null,
      externalRef: payment.external_reference ?? null,
      value: typeof payment.transaction_amount === 'number' ? payment.transaction_amount : null,
      netValue: payment.transaction_details?.net_received_amount ?? null,
      paidAt: payment.date_approved ?? null,
      raw: payment,
    };
  }

  async createCharge(input: CreateChargeInput): Promise<ProviderCharge> {
    if (!input.payerEmail) throw new PaymentProviderError('Mercado Pago exige o e-mail do pagador');
    const payment = await this.request<any>(
      'POST',
      '/v1/payments',
      {
        transaction_amount: Math.round(input.amount * 100) / 100,
        description: input.description.slice(0, 250),
        payment_method_id: 'pix',
        external_reference: input.externalRef,
        date_of_expiration: mercadoPagoExpiration(input.expiresInSec ?? 24 * 60 * 60),
        payer: {
          email: input.payerEmail,
          ...(input.payerCpf ? { identification: { type: 'CPF', number: input.payerCpf.replace(/\D/g, '') } } : {}),
        },
      },
      { 'X-Idempotency-Key': input.idempotencyKey },
    );
    return this.mapCharge(payment);
  }

  async getCharge(providerRef: string): Promise<ProviderCharge> {
    const payment = await this.request<any>('GET', `/v1/payments/${encodeURIComponent(providerRef)}`);
    return this.mapCharge(payment);
  }

  /** x-signature: "ts=...,v1=..." — HMAC-SHA256 do manifesto id:[data.id];request-id:[x-request-id];ts:[ts]; */
  verifyWebhook(request: WebhookRequest, secret: string): boolean {
    const signatureHeader = request.headers['x-signature'];
    const requestIdHeader = request.headers['x-request-id'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;
    if (!signature || !secret) return false;
    const parts = Object.fromEntries(
      String(signature)
        .split(',')
        .map((p) => p.trim().split('='))
        .map(([k, ...v]) => [k, v.join('=')]),
    ) as Record<string, string>;
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return false;
    const body = (request.body ?? {}) as any;
    const dataId = String(request.query?.['data.id'] ?? body?.data?.id ?? '');
    let manifest = '';
    if (dataId) manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
    if (requestId) manifest += `request-id:${requestId};`;
    manifest += `ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');
    return safeEqual(expected, String(v1));
  }

  parseWebhook(body: unknown): ProviderWebhookEvent {
    const b = (body ?? {}) as any;
    const type = String(b.type ?? b.topic ?? '');
    const dataId = b.data?.id ?? b.resource ?? null;
    if (type === 'payment' && dataId) {
      return {
        eventId: String(b.id ?? `${dataId}:${b.action ?? 'payment'}`),
        eventName: String(b.action ?? 'payment.updated'),
        kind: 'charge',
        providerRef: String(dataId),
        // status real só com GET /v1/payments/{id} — o handler reconsulta sempre
        status: 'unknown',
        raw: body,
      };
    }
    return { eventId: String(b.id ?? `${type}:${Date.now()}`), eventName: type || 'unknown', kind: 'other', raw: body };
  }

  async createSubscription(_input: CreateSubscriptionInput): Promise<ProviderSubscription> {
    throw new PaymentProviderError('Recorrência por Pix não é suportada no Mercado Pago via API — use Asaas para o dízimo automático');
  }

  async cancelCharge(providerRef: string): Promise<void> {
    try {
      await this.request('PUT', `/v1/payments/${encodeURIComponent(providerRef)}`, { status: 'cancelled' });
    } catch (error) {
      if (error instanceof PaymentProviderError && error.status === 404) return;
      throw error;
    }
  }

  async cancelSubscription(refs: { providerRef?: string | null }): Promise<void> {
    if (!refs.providerRef) return;
    await this.request('PUT', `/preapproval/${encodeURIComponent(refs.providerRef)}`, { status: 'cancelled' });
  }

  async refund(providerRef: string, amount?: number): Promise<{ status: string }> {
    const result = await this.request<any>(
      'POST',
      `/v1/payments/${encodeURIComponent(providerRef)}/refunds`,
      amount !== undefined ? { amount: Math.round(amount * 100) / 100 } : {},
      { 'X-Idempotency-Key': `refund-${providerRef}-${amount ?? 'full'}`, 'X-Render-In-Process-Refunds': 'true' },
    );
    return { status: result?.status ?? 'in_process' };
  }
}
