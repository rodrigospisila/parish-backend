import { TitheWhatsAppService, WHATSAPP_PIX_RESEND_MS } from './whatsapp.service';

/**
 * B25 da auditoria: o freio do comando PIX contava intents fora de CREATED —
 * como o Pix do mês aberto (CREATED) é reaproveitado e reenviado, o contador
 * nunca chegava ao limite e cada "PIX" virava uma mensagem paga do Twilio.
 */
describe('TitheWhatsAppService — comando PIX (B25)', () => {
  const member = {
    id: 'm1',
    fullName: 'Maria Silva',
    userId: 'u1',
    phone: '(42) 99999-1234',
    communityId: 'c1',
    whatsappOptIn: true,
    whatsappPixSentAt: null as Date | null,
    titheReminderDay: 10,
    community: { parishId: 'p1', parish: { name: 'Paróquia', whatsappEnabled: true } },
  };
  const parish = { id: 'p1', name: 'Paróquia', whatsappEnabled: true, titheEnabled: true, pixKey: 'chave@x.org', pixMerchantName: 'PAROQUIA', pixMerchantCity: 'PONTA GROSSA' };

  function setup() {
    const state = { sentAt: null as Date | null };
    const prisma: any = {
      member: {
        findMany: jest.fn(async () => [{ ...member, whatsappPixSentAt: state.sentAt }]),
        findFirst: jest.fn(async () => ({ id: 'm1', fullName: member.fullName, phone: member.phone, communityId: 'c1', community: { parishId: 'p1' } })),
        // Transição condicional como no Postgres: só toma a marca se estiver livre
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.OR) {
            const limit: Date = where.OR[1].whatsappPixSentAt.lt;
            if (state.sentAt && state.sentAt >= limit) return { count: 0 };
          } else if (where.whatsappPixSentAt && state.sentAt?.getTime() !== where.whatsappPixSentAt.getTime()) {
            return { count: 0 };
          }
          state.sentAt = data.whatsappPixSentAt;
          return { count: 1 };
        }),
        update: jest.fn(async ({ data }: any) => {
          state.sentAt = data.whatsappPixSentAt;
          return {};
        }),
      },
      titheIntent: {
        findFirst: jest.fn(async ({ where }: any) => (where.status === 'CONFIRMED' ? { amount: 50 } : { id: 'i1', brCode: '000201PIX' })),
        create: jest.fn(),
      },
      tither: { findUnique: jest.fn(async () => null) },
    };
    const messaging: any = {
      whatsappConfigured: true,
      normalizePhone: (p: string) => `+55${String(p).replace(/\D/g, '').replace(/^55/, '')}`,
      trySendWhatsApp: jest.fn().mockResolvedValue(true),
    };
    const tithe: any = { parishFor: jest.fn(async () => parish), parishUsable: () => true, currentMonth: () => '2026-10', newTxid: () => 'TX' };
    const service = new TitheWhatsAppService(prisma, messaging, { log: jest.fn() } as any, tithe);
    return { service, messaging, state };
  }

  it('responder PIX várias vezes envia o Pix uma vez só na janela', async () => {
    const { service, messaging } = setup();
    const replies: string[] = [];
    for (let i = 0; i < 5; i += 1) replies.push(await service.handleInbound('whatsapp:+5542999991234', 'PIX'));
    expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(1);
    expect(replies[0]).toBe('');
    expect(replies.slice(1).every((r) => r.includes('já enviamos o Pix há pouco'))).toBe(true);
  });

  it('passada a janela, o fiel pode pedir de novo', async () => {
    const { service, messaging, state } = setup();
    await service.handleInbound('whatsapp:+5542999991234', 'PIX');
    state.sentAt = new Date(Date.now() - WHATSAPP_PIX_RESEND_MS - 1000);
    await service.handleInbound('whatsapp:+5542999991234', 'PIX');
    expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(2);
  });

  it('envio que falhou devolve a marca (não bloqueia a nova tentativa)', async () => {
    const { service, messaging, state } = setup();
    messaging.trySendWhatsApp.mockResolvedValueOnce(false);
    const reply = await service.handleInbound('whatsapp:+5542999991234', 'PIX');
    expect(reply).toContain('não consegui gerar o Pix');
    expect(state.sentAt).toBeNull();
    await service.handleInbound('whatsapp:+5542999991234', 'PIX');
    expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(2);
  });

  it('o lembrete mensal também conta como envio', async () => {
    const { service, messaging, state } = setup();
    await service.sendMonthlyPix('m1', '2026-10');
    expect(state.sentAt).toBeInstanceOf(Date);
    await service.handleInbound('whatsapp:+5542999991234', 'PIX');
    expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(1);
  });
});
