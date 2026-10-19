import { AsaasProvider } from './asaas.provider';
import {
  createPlatformAsaasProvider,
  platformCheckoutProblem,
  platformTokenMatches,
  readPlatformAsaasConfig,
  readPlatformNfseSettings,
} from './platform-provider';

type Call = { url: string; init?: RequestInit };

function fakeFetch(routes: Record<string, (init?: RequestInit) => { status?: number; body: unknown }>) {
  const calls: Call[] = [];
  const impl = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url.replace(/^https?:\/\/[^/]+\/v3/, '')}`;
    const match = Object.keys(routes).find((r) => key.startsWith(r));
    if (!match) return new Response(JSON.stringify({ errors: [{ description: `rota não simulada: ${key}` }] }), { status: 404 });
    const out = routes[match](init);
    return new Response(JSON.stringify(out.body), { status: out.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { impl, calls };
}

const bodyOf = (call: Call) => JSON.parse(String(call.init!.body));

describe('Provedor da plataforma (conta Asaas da empresa)', () => {
  it('sem PLATFORM_ASAAS_API_KEY: sem config e contratação indisponível (explicada)', () => {
    expect(readPlatformAsaasConfig({})).toBeNull();
    expect(platformCheckoutProblem({})).toContain('PLATFORM_ASAAS_API_KEY');
    expect(platformCheckoutProblem({ PLATFORM_ASAAS_API_KEY: 'k' })).toContain('PLATFORM_ASAAS_WEBHOOK_TOKEN');
    expect(platformCheckoutProblem({ PLATFORM_ASAAS_API_KEY: 'k', PLATFORM_ASAAS_WEBHOOK_TOKEN: 't' })).toBeNull();
  });

  it('ambiente: sandbox por padrão, production só explícito', async () => {
    expect(readPlatformAsaasConfig({ PLATFORM_ASAAS_API_KEY: ' k ' })).toEqual({ apiKey: 'k', env: 'sandbox', webhookToken: null });
    const prod = readPlatformAsaasConfig({ PLATFORM_ASAAS_API_KEY: 'k', PLATFORM_ASAAS_ENV: 'PRODUCTION', PLATFORM_ASAAS_WEBHOOK_TOKEN: 't' })!;
    expect(prod.env).toBe('production');
    const { impl, calls } = fakeFetch({ 'GET /subscriptions/sub_1/payments': () => ({ body: { data: [] } }) });
    await createPlatformAsaasProvider(prod, impl).listSubscriptionPayments('sub_1');
    expect(calls[0].url.startsWith('https://api.asaas.com/v3/')).toBe(true);
  });

  it('token do webhook comparado em tempo constante (hash), inclusive tamanho diferente', () => {
    expect(platformTokenMatches('abc', 'abc')).toBe(true);
    expect(platformTokenMatches(['abc'], 'abc')).toBe(true);
    expect(platformTokenMatches('abd', 'abc')).toBe(false);
    expect(platformTokenMatches('abcd', 'abc')).toBe(false);
    expect(platformTokenMatches(undefined, 'abc')).toBe(false);
    expect(platformTokenMatches('abc', '')).toBe(false);
  });

  it('NFS-e só com nome do serviço e id/código municipal', () => {
    expect(readPlatformNfseSettings({ PLATFORM_NFSE_SERVICE_NAME: 'Licença de software' })).toBeNull();
    const nfse = readPlatformNfseSettings({
      PLATFORM_NFSE_SERVICE_NAME: 'Licença de software',
      PLATFORM_NFSE_SERVICE_CODE: '1.05',
      PLATFORM_NFSE_ISS: '2,5',
      PLATFORM_NFSE_RETAIN_ISS: 'true',
      PLATFORM_NFSE_EFFECTIVE: 'qualquer',
    })!;
    expect(nfse).toMatchObject({ municipalServiceCode: '1.05', iss: 2.5, retainIss: true, effectiveDatePeriod: 'ON_PAYMENT_CONFIRMATION', pis: 0 });
  });
});

describe('AsaasProvider — métodos da plataforma (acréscimos; os do dízimo não mudam)', () => {
  const creds = { apiKey: '$aact_hmlg_plataforma', env: 'sandbox' as const };

  it('savePlatformCustomer: cria com endereço e notificações do Asaas ligadas; atualiza quando já existe', async () => {
    const { impl, calls } = fakeFetch({
      'GET /customers?cpfCnpj=11222333000181': () => ({ body: { data: [] } }),
      'POST /customers': () => ({ body: { id: 'cus_new' } }),
      'PUT /customers/cus_old': () => ({ body: { id: 'cus_old' } }),
    });
    const p = new AsaasProvider(creds, impl);
    const input = {
      name: 'Mitra Diocesana — Paróquia X',
      cpfCnpj: '11.222.333/0001-81',
      email: 'fin@paroquia.org',
      zipCode: '84430-000',
      street: 'Rua A',
      number: '10',
      neighborhood: 'Centro',
      municipalRegistration: '123',
      externalRef: 'billing:acc1',
    };
    expect(await p.savePlatformCustomer(input)).toEqual({ providerCustomerId: 'cus_new' });
    const post = calls.find((c) => c.init?.method === 'POST')!;
    expect(bodyOf(post)).toMatchObject({
      cpfCnpj: '11222333000181',
      postalCode: '84430000',
      address: 'Rua A',
      addressNumber: '10',
      province: 'Centro',
      municipalInscription: '123',
      notificationDisabled: false,
      externalReference: 'billing:acc1',
    });
    expect(await p.savePlatformCustomer({ ...input, providerCustomerId: 'cus_old' })).toEqual({ providerCustomerId: 'cus_old' });
    expect(calls.filter((c) => (c.init?.method ?? 'GET') === 'GET')).toHaveLength(1); // com id conhecido, não busca
  });

  it('createPlatformSubscription: ciclo anual, valor em reais, pagador escolhe o meio (UNDEFINED)', async () => {
    const { impl, calls } = fakeFetch({
      'POST /subscriptions': () => ({ body: { id: 'sub_1', status: 'ACTIVE', nextDueDate: '2026-11-23' } }),
    });
    const sub = await new AsaasProvider(creds, impl).createPlatformSubscription({
      providerCustomerId: 'cus_1',
      valueCents: 218000,
      cycle: 'YEARLY',
      nextDueDate: '2026-11-23',
      description: 'Parish — assinatura anual',
      externalRef: 'billing:acc1',
    });
    expect(sub).toMatchObject({ providerRef: 'sub_1', nextDueDate: '2026-11-23' });
    expect(bodyOf(calls[0])).toEqual({
      customer: 'cus_1',
      billingType: 'UNDEFINED',
      value: 2180,
      nextDueDate: '2026-11-23',
      cycle: 'YEARLY',
      description: 'Parish — assinatura anual',
      externalReference: 'billing:acc1',
    });
  });

  it('updatePlatformSubscription leva o valor novo às cobranças em aberto; lista e NFS-e', async () => {
    const { impl, calls } = fakeFetch({
      'PUT /subscriptions/sub_1': () => ({ body: { id: 'sub_1', nextDueDate: '2026-12-01' } }),
      'GET /subscriptions/sub_1/payments': () => ({
        body: {
          data: [
            { id: 'pay_1', status: 'PENDING', value: 98, dueDate: '2026-12-01', invoiceUrl: 'https://sandbox.asaas.com/i/abc', subscription: 'sub_1' },
          ],
        },
      }),
      'POST /subscriptions/sub_1/invoiceSettings': () => ({ body: { ok: true } }),
    });
    const p = new AsaasProvider(creds, impl);
    await p.updatePlatformSubscription('sub_1', { valueCents: 9800, cycle: 'MONTHLY', description: 'x' });
    expect(bodyOf(calls[0])).toMatchObject({ value: 98, cycle: 'MONTHLY', updatePendingPayments: true });
    const payments = await p.listSubscriptionPayments('sub_1');
    expect(payments[0]).toMatchObject({
      providerRef: 'pay_1',
      status: 'pending',
      paymentUrl: 'https://sandbox.asaas.com/i/abc',
      subscriptionRef: 'sub_1',
    });
    await p.setSubscriptionInvoiceSettings('sub_1', { municipalServiceName: 'Licença', municipalServiceCode: '1.05', iss: 2 });
    expect(bodyOf(calls[2])).toMatchObject({
      municipalServiceCode: '1.05',
      municipalServiceName: 'Licença',
      effectiveDatePeriod: 'ON_PAYMENT_CONFIRMATION',
      taxes: { retainIss: false, iss: 2, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
    });
  });
});
