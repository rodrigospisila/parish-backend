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

  function setup(plan?: { mode: 'off' | 'log' | 'on'; hasAccess: boolean }) {
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
    tithe.notifyTreasury = jest.fn();
    const planAccess: any = plan
      ? { enforcement: jest.fn().mockReturnValue(plan.mode), targetHasAccess: jest.fn().mockResolvedValue(plan.hasAccess) }
      : undefined;
    const service = new TitheWhatsAppService(prisma, messaging, { log: jest.fn() } as any, tithe, planAccess);
    return { service, messaging, state, prisma, tithe, planAccess };
  }

  describe('plano (dízimo é recurso pago da paróquia)', () => {
    it('on + paróquia sem acesso: comando PIX responde que não está ativo — sem Pix, sem mensagem paga, sem gastar o freio', async () => {
      const { service, messaging, prisma, state, planAccess } = setup({ mode: 'on', hasAccess: false });
      const reply = await service.handleInbound('whatsapp:+5542999991234', 'PIX');
      expect(reply).toContain('a contribuição pelo Parish não está ativa na sua paróquia no momento');
      expect(planAccess.targetHasAccess).toHaveBeenCalledWith({ parishId: 'p1' });
      expect(messaging.trySendWhatsApp).not.toHaveBeenCalled();
      expect(prisma.titheIntent.create).not.toHaveBeenCalled();
      expect(prisma.member.updateMany).not.toHaveBeenCalled();
      expect(state.sentAt).toBeNull();
    });

    it('on + paróquia sem acesso: o lembrete mensal (cron) não cria nem envia; QUERO não promete o Pix', async () => {
      const { service, messaging, prisma } = setup({ mode: 'on', hasAccess: false });
      await expect(service.sendMonthlyPix('m1', '2026-10')).resolves.toBe(false);
      expect(messaging.trySendWhatsApp).not.toHaveBeenCalled();
      expect(prisma.titheIntent.create).not.toHaveBeenCalled();
      const reply = await service.handleInbound('whatsapp:+5542999991234', 'QUERO');
      expect(reply).toContain('não está ativa na sua paróquia');
      expect(prisma.member.update).not.toHaveBeenCalled();
    });

    it('on + paróquia sem acesso: PAGUEI de um Pix já enviado continua (dinheiro em trânsito) e SAIR também', async () => {
      const { service, prisma, tithe, planAccess } = setup({ mode: 'on', hasAccess: false });
      prisma.titheIntent.findFirst = jest.fn(async () => ({
        id: 'i1',
        amount: 50,
        referenceMonth: '2026-10',
        txid: 'TX',
        communityId: 'c1',
        parishId: 'p1',
        member: { fullName: 'Maria Silva', communityId: 'c1' },
      }));
      prisma.titheIntent.count = jest.fn().mockResolvedValue(0);
      prisma.titheIntent.updateMany = jest.fn().mockResolvedValue({ count: 1 });
      const reply = await service.handleInbound('whatsapp:+5542999991234', 'PAGUEI');
      expect(reply).toContain('Avisamos a tesouraria');
      expect(prisma.titheIntent.updateMany).toHaveBeenCalledWith({ where: { id: 'i1', status: 'CREATED' }, data: expect.objectContaining({ status: 'DECLARED' }) });
      expect(tithe.notifyTreasury).toHaveBeenCalledTimes(1);
      expect(await service.handleInbound('whatsapp:+5542999991234', 'SAIR')).toContain('não receberá mais');
      expect(planAccess.targetHasAccess).not.toHaveBeenCalled();
    });

    it('on + paróquia com acesso: PIX sai normalmente', async () => {
      const { service, messaging } = setup({ mode: 'on', hasAccess: true });
      expect(await service.handleInbound('whatsapp:+5542999991234', 'PIX')).toBe('');
      expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(1);
    });

    it.each(['off', 'log'] as const)('%s: nada muda, nem consulta o plano', async (mode) => {
      const { service, messaging, planAccess } = setup({ mode, hasAccess: false });
      expect(await service.handleInbound('whatsapp:+5542999991234', 'PIX')).toBe('');
      expect(messaging.trySendWhatsApp).toHaveBeenCalledTimes(1);
      expect(planAccess.targetHasAccess).not.toHaveBeenCalled();
    });
  });

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
