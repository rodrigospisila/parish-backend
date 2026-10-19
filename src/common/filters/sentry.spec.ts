import { captureServerError, initSentry, isSentryEnabled, resetSentryForTests, scrubSentryEvent } from './sentry';

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
});
