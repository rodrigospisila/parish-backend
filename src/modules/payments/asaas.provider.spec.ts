import { AsaasProvider, mapAsaasStatus } from './asaas.provider';
import { MercadoPagoProvider, mapMercadoPagoStatus, mercadoPagoExpiration } from './mercadopago.provider';
import { createHmac } from 'crypto';

type Call = { url: string; init?: RequestInit };

/** fetch simulado: responde por rota e guarda as chamadas para asserções. */
function fakeFetch(routes: Record<string, (init?: RequestInit) => { status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const impl = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url.replace(/^https?:\/\/[^/]+\/v3/, '').replace(/^https?:\/\/[^/]+/, '')}`;
    const match = Object.keys(routes).find((r) => key.startsWith(r));
    if (!match) return new Response(JSON.stringify({ errors: [{ description: `rota não simulada: ${key}` }] }), { status: 404 });
    const out = routes[match](init);
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { impl, calls };
}

describe('AsaasProvider', () => {
  const creds = { apiKey: '$aact_hmlg_test', env: 'sandbox' as const, webhookSecret: 'tok-super-secreto-1234567890abcdef' };

  it('reaproveita cliente existente por CPF e cria quando não há', async () => {
    const { impl, calls } = fakeFetch({
      'GET /customers?cpfCnpj=12345678909': () => ({ body: { data: [{ id: 'cus_1' }] } }),
      'GET /customers?cpfCnpj=98765432100': () => ({ body: { data: [] } }),
      'POST /customers': () => ({ body: { id: 'cus_new' } }),
    });
    const p = new AsaasProvider(creds, impl);
    expect(await p.ensureCustomer({ cpfCnpj: '123.456.789-09', name: 'Maria', externalRef: 'm1' })).toEqual({ providerCustomerId: 'cus_1' });
    expect(await p.ensureCustomer({ cpfCnpj: '987.654.321-00', name: 'José', email: 'j@x.br', externalRef: 'm2' })).toEqual({ providerCustomerId: 'cus_new' });
    const post = calls.find((c) => c.init?.method === 'POST')!;
    expect(JSON.parse(String(post.init!.body))).toMatchObject({ cpfCnpj: '98765432100', name: 'José', notificationDisabled: true });
    // autenticação e User-Agent obrigatórios
    expect((post.init!.headers as Record<string, string>)['access_token']).toBe('$aact_hmlg_test');
    expect((post.init!.headers as Record<string, string>)['User-Agent']).toContain('Parish');
    expect(calls[0].url.startsWith('https://api-sandbox.asaas.com/v3/')).toBe(true);
  });

  it('cria cobrança Pix e busca o QR (payload + imagem + expiração)', async () => {
    const { impl, calls } = fakeFetch({
      'POST /payments': () => ({ body: { id: 'pay_1', status: 'PENDING', value: 50, externalReference: 'intent-1', dueDate: '2026-09-05' } }),
      'GET /payments/pay_1/pixQrCode': () => ({ body: { payload: '000201...', encodedImage: 'iVBOR', expirationDate: '2026-09-05 23:59:59' } }),
    });
    const p = new AsaasProvider(creds, impl);
    const charge = await p.createCharge({
      providerCustomerId: 'cus_1', amount: 50, dueDate: '2026-09-05', description: 'Dizimo 2026-09', externalRef: 'intent-1', idempotencyKey: 'k1',
    });
    expect(charge).toMatchObject({ providerRef: 'pay_1', status: 'pending', qrPayload: '000201...', qrImageBase64: 'iVBOR', externalRef: 'intent-1' });
    const body = JSON.parse(String(calls[0].init!.body));
    expect(body).toMatchObject({ customer: 'cus_1', billingType: 'PIX', value: 50, dueDate: '2026-09-05', externalReference: 'intent-1' });
    // GET vai sem body (Asaas devolve 403 com body em GET)
    expect(calls[1].init!.body).toBeUndefined();
  });

  it('mapeia status e erros do provedor', async () => {
    expect(mapAsaasStatus('CONFIRMED')).toBe('confirmed');
    expect(mapAsaasStatus('RECEIVED')).toBe('received');
    expect(mapAsaasStatus('OVERDUE')).toBe('overdue');
    expect(mapAsaasStatus('REFUNDED')).toBe('refunded');
    expect(mapAsaasStatus('PENDING', true)).toBe('cancelled');
    const { impl } = fakeFetch({ 'GET /payments/pay_x': () => ({ status: 401, body: { errors: [{ description: 'invalid_access_token' }] } }) });
    await expect(new AsaasProvider(creds, impl).getCharge('pay_x')).rejects.toThrow(/invalid_access_token/);
  });

  it('valida o webhook pelo header asaas-access-token e interpreta eventos', () => {
    const p = new AsaasProvider(creds);
    const body = { id: 'evt_1', event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', status: 'RECEIVED', externalReference: 'intent-1', subscription: 'sub_9' } };
    expect(p.verifyWebhook({ headers: { 'asaas-access-token': creds.webhookSecret }, body }, creds.webhookSecret)).toBe(true);
    expect(p.verifyWebhook({ headers: { 'asaas-access-token': 'errado' }, body }, creds.webhookSecret)).toBe(false);
    expect(p.verifyWebhook({ headers: {}, body }, creds.webhookSecret)).toBe(false);
    expect(p.parseWebhook(body)).toMatchObject({ eventId: 'evt_1', kind: 'charge', providerRef: 'pay_1', externalRef: 'intent-1', status: 'received', subscriptionRef: 'sub_9' });
    expect(p.parseWebhook({ id: 'evt_2', event: 'PAYMENT_DELETED', payment: { id: 'pay_2', status: 'PENDING' } }).status).toBe('cancelled');
    // Formato da doc "Eventos para Pix Automático": objeto em `authorization` (sem id de evento)
    expect(p.parseWebhook({ event: 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED', authorization: { id: 'aut_1', status: 'ACTIVE', customerId: 'cus_1', frequency: 'MONTHLY', value: 2 }, paymentId: 'pay_first' }))
      .toMatchObject({ kind: 'authorization', authorizationRef: 'aut_1', authorizationStatus: 'ACTIVE', paymentId: 'pay_first', eventId: 'aut_1:PIX_AUTOMATIC_RECURRING_AUTHORIZATION_ACTIVATED:pay_first' });
    // Formato da página de fluxos: `pixAutomaticAuthorization` como string (id)
    expect(p.parseWebhook({ id: 'evt_4', event: 'PIX_AUTOMATIC_RECURRING_AUTHORIZATION_CANCELLED', pixAutomaticAuthorization: 'aut_2' }))
      .toMatchObject({ eventId: 'evt_4', kind: 'authorization', authorizationRef: 'aut_2', authorizationStatus: 'CANCELLED', paymentId: null });
  });

  it('Pix Automático: autorização com paymentCreationMode SUBSCRIPTION e QR imediato', async () => {
    const { impl, calls } = fakeFetch({
      'POST /pix/automatic/authorizations': () => ({ body: { id: 'aut_1', status: 'CREATED', payload: '000201auth', encodedImage: 'img', subscriptionId: null, immediateQrCode: { expirationDate: '2026-09-01 10:00:00' } } }),
      'POST /subscriptions': () => ({ body: { id: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-09-10' } }),
      'DELETE /pix/automatic/authorizations/aut_1': () => ({ body: { status: 'CANCELLED' } }),
      'DELETE /subscriptions/sub_1': () => ({ body: { deleted: true } }),
      'DELETE /subscriptions/sub_gone': () => ({ status: 404, body: { errors: [{ description: 'not found' }] } }),
      'DELETE /payments/pay_1': () => ({ body: { deleted: true } }),
      'GET /pix/automatic/authorizations/aut_1': () => ({ body: { id: 'aut_1', status: 'ACTIVE', subscriptionId: 'sub_from_auth' } }),
    });
    const p = new AsaasProvider(creds, impl);
    const auto = await p.createSubscription({ providerCustomerId: 'cus_1', amount: 100, cycle: 'MONTHLY', startDate: '2026-09-10', description: 'Dizimo mensal', externalRef: 'sched-1', mode: 'pix_automatic' });
    expect(auto).toMatchObject({ authorizationRef: 'aut_1', status: 'CREATED', qrPayload: '000201auth' });
    expect(JSON.parse(String(calls[0].init!.body))).toMatchObject({ frequency: 'MONTHLY', customerId: 'cus_1', paymentCreationMode: 'SUBSCRIPTION', value: 100, immediateQrCode: { originalValue: 100 } });
    const classic = await p.createSubscription({ providerCustomerId: 'cus_1', amount: 100, cycle: 'MONTHLY', startDate: '2026-09-10', description: 'Dizimo mensal', externalRef: 'sched-2', mode: 'pix_subscription' });
    expect(classic).toMatchObject({ providerRef: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-09-10' });
    await p.cancelSubscription({ providerRef: 'sub_1', authorizationRef: 'aut_1' });
    expect(calls.filter((c) => c.init?.method === 'DELETE')).toHaveLength(2);
    // "não encontrado" no cancelamento = já não cobra: não é erro
    await expect(p.cancelSubscription({ providerRef: 'sub_gone' })).resolves.toBeUndefined();
    await expect(p.cancelCharge('pay_1')).resolves.toBeUndefined();
    // A assinatura nasce na ativação: é lida da própria autorização
    expect(await p.getAuthorization('aut_1')).toMatchObject({ authorizationRef: 'aut_1', status: 'ACTIVE', subscriptionRef: 'sub_from_auth' });
  });
});

describe('MercadoPagoProvider', () => {
  const creds = { apiKey: 'APP_USR-token', env: 'production' as const, webhookSecret: 'segredo-mp' };

  it('cria pagamento Pix com X-Idempotency-Key e devolve QR', async () => {
    const { impl, calls } = fakeFetch({
      'POST /v1/payments': () => ({ body: { id: 123, status: 'pending', external_reference: 'intent-1', transaction_amount: 30, point_of_interaction: { transaction_data: { qr_code: '000201mp', qr_code_base64: 'img' } }, date_of_expiration: '2026-09-01T10:00:00.000-03:00' } }),
    });
    const p = new MercadoPagoProvider(creds, impl);
    const charge = await p.createCharge({ amount: 30, dueDate: '2026-09-01', description: 'Oferta', externalRef: 'intent-1', idempotencyKey: 'intent-1', payerEmail: 'a@b.br', payerCpf: '123.456.789-09' });
    expect(charge).toMatchObject({ providerRef: '123', status: 'pending', qrPayload: '000201mp' });
    const headers = calls[0].init!.headers as Record<string, string>;
    expect(headers['X-Idempotency-Key']).toBe('intent-1');
    expect(headers.Authorization).toBe('Bearer APP_USR-token');
    expect(JSON.parse(String(calls[0].init!.body))).toMatchObject({ payment_method_id: 'pix', payer: { email: 'a@b.br', identification: { type: 'CPF', number: '12345678909' } } });
    expect(mercadoPagoExpiration(60)).toMatch(/\.000-03:00$/);
  });

  it('valida x-signature (HMAC do manifesto) e mapeia status', () => {
    const p = new MercadoPagoProvider(creds);
    const ts = '1700000000';
    const manifest = `id:123;request-id:req-1;ts:${ts};`;
    const v1 = createHmac('sha256', creds.webhookSecret).update(manifest).digest('hex');
    const req = { headers: { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': 'req-1' }, body: { data: { id: '123' } }, query: { 'data.id': '123' } };
    expect(p.verifyWebhook(req, creds.webhookSecret)).toBe(true);
    expect(p.verifyWebhook({ ...req, headers: { ...req.headers, 'x-signature': `ts=${ts},v1=deadbeef` } }, creds.webhookSecret)).toBe(false);
    expect(mapMercadoPagoStatus('approved')).toBe('received');
    expect(mapMercadoPagoStatus('rejected')).toBe('cancelled');
    expect(p.parseWebhook({ id: 9, type: 'payment', action: 'payment.updated', data: { id: '123' } })).toMatchObject({ kind: 'charge', providerRef: '123', eventId: '9' });
    // recorrência por Pix não existe via API no MP
    return expect(p.createSubscription({ providerCustomerId: 'x', amount: 10, cycle: 'MONTHLY', startDate: '2026-09-01', description: 'd', externalRef: 'e', mode: 'pix_automatic' })).rejects.toThrow(/Asaas/);
  });
});
