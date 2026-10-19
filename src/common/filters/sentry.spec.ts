import {
  captureServerError,
  initSentry,
  isSentryEnabled,
  maskPersonalData,
  resetSentryForTests,
  scrubSentryEvent,
} from './sentry';

const mockScope = { setTag: jest.fn() };
jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((fn: (scope: any) => void) => fn(mockScope)),
  captureException: jest.fn(),
}));

/** eng-qualidade-03: Sentry só com DSN e sem dado pessoal. */
describe('Sentry (backend)', () => {
  afterEach(() => resetSentryForTests());

  it('sem SENTRY_DSN: não inicializa e capturar não faz nada (o boot não muda)', () => {
    expect(initSentry({} as NodeJS.ProcessEnv)).toBe(false);
    expect(initSentry({ SENTRY_DSN: '   ' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isSentryEnabled()).toBe(false);
    expect(() => captureServerError(new Error('x'), { requestId: 'abc' })).not.toThrow();
  });

  it('limpa o evento: sem corpo, query, cookies, Authorization/Cookie; usuário só com id; sem breadcrumbs', () => {
    const event: any = scrubSentryEvent({
      request: {
        url: 'https://api/x/users?busca=maria',
        query_string: 'busca=maria',
        data: { password: '123', cpf: '000' },
        cookies: { session: 's' },
        headers: { Authorization: 'Bearer abc', cookie: 'a=b', 'user-agent': 'app' },
      },
      user: { id: 'u1', email: 'maria@x.com', ip_address: '1.2.3.4' },
      breadcrumbs: [{ message: 'GET https://maps?address=Rua X' }],
    });
    expect(event.request).toEqual({ url: 'https://api/x/users', headers: { 'user-agent': 'app' } });
    expect(event.user).toEqual({ id: 'u1' });
    expect(event.breadcrumbs).toBeUndefined();
  });

  describe('R12/R14: mensagem da exceção sem dado pessoal', () => {
    it('erro do Prisma: a mensagem (com os valores da consulta) vira texto genérico com o code', () => {
      const event: any = scrubSentryEvent({
        tags: { requestId: 'r1', errorCode: 'P2002' },
        exception: {
          values: [
            {
              type: 'PrismaClientValidationError',
              value: 'Invalid `prisma.member.create()` invocation: { data: { fullName: "Maria Souza", cpf: "12345678901" } }',
            },
            { type: 'PrismaClientKnownRequestError', value: 'Unique constraint failed on the fields: (`email`) maria@x.com' },
          ],
        },
      });
      for (const item of event.exception.values) {
        expect(item.value).toMatch(/^Erro do banco de dados \(PrismaClient\w+ code=P2002\); mensagem omitida$/);
        expect(item.value).not.toMatch(/Maria|12345678901|maria@x\.com/);
      }
    });

    it('erro do Prisma sem code: texto genérico só com o tipo', () => {
      const event: any = scrubSentryEvent({
        exception: { values: [{ type: 'PrismaClientUnknownRequestError', value: 'invalid input syntax for type uuid: "Maria"' }] },
      });
      expect(event.exception.values[0].value).toBe('Erro do banco de dados (PrismaClientUnknownRequestError); mensagem omitida');
    });

    it('demais erros: e-mail, CPF, telefone e números longos mascarados; o resto fica', () => {
      const event: any = scrubSentryEvent({
        message: 'Falha ao avisar ana@x.com',
        exception: {
          values: [
            { type: 'Error', value: 'Twilio: número +55 (42) 99999-8883 inválido para maria.souza@gmail.com' },
            { type: 'Error', value: 'Asaas recusou o CPF 123.456.789-01 / 12345678901 (cliente 1234567890123)' },
          ],
        },
        extra: { __serialized__: { cpf: '12345678901' }, outro: 1 },
      });
      expect(event.exception.values[0].value).toBe('Twilio: número [telefone] inválido para [e-mail]');
      expect(event.exception.values[1].value).toBe('Asaas recusou o CPF [cpf] / [cpf] (cliente [número])');
      expect(event.message).toBe('Falha ao avisar [e-mail]');
      expect(event.extra).toEqual({ outro: 1 });
    });

    it('maskPersonalData: telefones em vários formatos, CNPJ; números curtos (status, porta) ficam; corta em 500', () => {
      expect(maskPersonalData('ligue (42) 9999-8888 ou 42 99999 8888 ou +5542999998883')).toBe(
        'ligue [telefone] ou [telefone] ou [telefone]',
      );
      expect(maskPersonalData('CNPJ 12.345.678/0001-90')).toBe('CNPJ [cnpj]');
      expect(maskPersonalData('status 500 na porta 3003, linha 42')).toBe('status 500 na porta 3003, linha 42');
      expect(maskPersonalData('x'.repeat(800))).toHaveLength(500);
    });

    it('captureServerError: o code do Prisma vai como tag (a mensagem é trocada no beforeSend)', () => {
      expect(initSentry({ SENTRY_DSN: 'https://k@o.ingest.sentry.io/1' } as NodeJS.ProcessEnv)).toBe(true);
      const error: any = new Error('Unique constraint failed');
      error.name = 'PrismaClientKnownRequestError';
      error.code = 'P2002';
      captureServerError(error, { requestId: 'r1', status: 500 });
      expect(mockScope.setTag).toHaveBeenCalledWith('errorCode', 'P2002');

      mockScope.setTag.mockClear();
      const other: any = new Error('x');
      other.code = 'ECONNRESET ana@x.com';
      captureServerError(other, { requestId: 'r2' });
      expect(mockScope.setTag).not.toHaveBeenCalledWith('errorCode', expect.anything());
    });
  });
});
