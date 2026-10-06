import { readFileSync } from 'fs';
import { join } from 'path';
import { GLOBAL_OMIT, PrismaService } from './prisma.service';

/**
 * Segredos fora das respostas (camada 1): o omit global do PrismaService.
 *
 * Sem banco: o motor do Prisma é trocado por um falso que devolve SÓ o que a
 * consulta pediu (como o de verdade faz) a partir de registros completos — com
 * os segredos preenchidos. Se o omit global sumir ou um include novo os trouxer,
 * o JSON da "resposta" passa a contê-los e o teste cai.
 */

const SECRETS = {
  providerApiKeyEnc: 'ENC::chave-da-api-do-asaas',
  providerWebhookToken: 'whk_token_do_webhook',
  twoFactorSecret: 'ENC::semente-totp',
  twoFactorBackupCodes: ['hmac-codigo-1', 'hmac-codigo-2'],
  pushToken: 'ExponentPushToken[aparelho-do-fiel]',
};

const diocese = { id: 'd1', name: 'Diocese de Ponta Grossa', city: 'Ponta Grossa', state: 'PR' };
const parish = {
  id: 'p1',
  name: 'Paróquia Santa Rita',
  city: 'Ponta Grossa',
  state: 'PR',
  dioceseId: 'd1',
  pixKey: '00.000.000/0001-00',
  paymentProvider: 'ASAAS',
  providerApiKeyEnc: SECRETS.providerApiKeyEnc,
  providerWebhookToken: SECRETS.providerWebhookToken,
  diocese,
};
const community = { id: 'c1', name: 'Matriz', city: 'Ponta Grossa', parishId: 'p1', parish };
const user = {
  id: 'u1',
  email: 'paroco@x.com',
  password: '$2b$10$hash',
  name: 'Pároco',
  role: 'PARISH_ADMIN',
  parishId: 'p1',
  twoFactorEnabled: true,
  twoFactorSecret: SECRETS.twoFactorSecret,
  twoFactorBackupCodes: SECRETS.twoFactorBackupCodes,
  pushToken: SECRETS.pushToken,
  parish,
};
const event = { id: 'e1', title: 'Festa da padroeira', communityId: 'c1', community };
(parish as any).communities = [{ ...community, parish: undefined }];
(diocese as any).parishes = [{ ...parish, diocese: undefined }];

const ROWS: Record<string, any> = { Event: event, Parish: parish, Community: community, User: user, Diocese: diocese };

const isRelation = (value: unknown) =>
  (value !== null && typeof value === 'object' && !Array.isArray(value)) ||
  (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object');

/** O que o motor do Prisma faz com a seleção: `$scalars` = todas as colunas, salvo as marcadas `false`. */
function project(row: any, selection: any): any {
  if (row === undefined || row === null) return null;
  if (Array.isArray(row)) return row.map((r) => project(r, selection));
  const out: any = {};
  if (selection.$scalars) {
    for (const [key, value] of Object.entries(row)) {
      if (value !== undefined && !isRelation(value) && selection[key] !== false) out[key] = value;
    }
  }
  for (const [key, sel] of Object.entries<any>(selection)) {
    if (key.startsWith('$') || sel === false) continue;
    if (sel === true) out[key] = row[key];
    else out[key] = project(row[key], sel.selection);
  }
  return out;
}

function fakeEngine(prisma: PrismaService) {
  const engine = (prisma as any)._engine;
  const answer = (q: any) => {
    const base = ROWS[q.modelName];
    const data = project(q.action === 'findMany' ? [base] : base, q.query.selection);
    return { data: { [`${q.action}${q.modelName}`]: data } };
  };
  engine.request = async (q: any) => answer(q);
  engine.requestBatch = async (batch: any) => batch.queries.map((q: any) => answer(q));
}

describe('PrismaService — segredos nunca saem numa leitura comum', () => {
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = new PrismaService();
    fakeEngine(prisma);
  });

  const leaks = (result: unknown) => {
    const json = JSON.stringify(result);
    return Object.entries(SECRETS)
      .filter(([, value]) => (Array.isArray(value) ? value.some((v) => json.includes(v)) : json.includes(value)))
      .map(([key]) => key);
  };

  it('GET /events/:id: evento → comunidade → paróquia inteira (include: true) não carrega o token do webhook', async () => {
    const res = await prisma.event.findUnique({ where: { id: 'e1' }, include: { community: { include: { parish: true } } } });
    expect(res?.community.parish.name).toBe('Paróquia Santa Rita'); // o resto da paróquia continua vindo
    expect(leaks(res)).toEqual([]);
  });

  it('paróquia sem select, árvore da diocese e usuário com a paróquia: nenhum segredo', async () => {
    const parishes = await prisma.parish.findMany();
    const tree = await prisma.diocese.findUnique({ where: { id: 'd1' }, include: { parishes: { include: { communities: true } } } });
    const account = await prisma.user.findUnique({ where: { id: 'u1' }, include: { parish: true } });
    expect(parishes[0].pixKey).toBe('00.000.000/0001-00'); // chave Pix é pública (vai no BR Code)
    expect(tree?.parishes).toHaveLength(1);
    expect(account?.twoFactorEnabled).toBe(true);
    expect(leaks(parishes)).toEqual([]);
    expect(leaks(tree)).toEqual([]);
    expect(leaks(account)).toEqual([]);
  });

  it('quem PRECISA do segredo (dízimo, webhook, 2FA, push) o lê com select explícito ou omit: false', async () => {
    const viaSelect = await prisma.parish.findUnique({ where: { id: 'p1' }, select: { providerWebhookToken: true, providerApiKeyEnc: true } });
    const viaOmit = await prisma.parish.findUnique({ where: { id: 'p1' }, omit: { providerWebhookToken: false } });
    const twoFactor = await prisma.user.findUnique({ where: { id: 'u1' }, select: { twoFactorSecret: true, twoFactorBackupCodes: true, pushToken: true } });
    expect(viaSelect).toEqual({ providerWebhookToken: SECRETS.providerWebhookToken, providerApiKeyEnc: SECRETS.providerApiKeyEnc });
    expect(viaOmit?.providerWebhookToken).toBe(SECRETS.providerWebhookToken);
    expect(viaOmit).not.toHaveProperty('providerApiKeyEnc');
    expect(twoFactor?.twoFactorSecret).toBe(SECRETS.twoFactorSecret);
    expect(twoFactor?.pushToken).toBe(SECRETS.pushToken);
  });

  it('o tipo do resultado também esconde os segredos (ler sem select não compila)', () => {
    // Nunca executa: só a checagem de tipos do ts-jest importa aqui
    const typeCheckOnly = async () => {
      const p = await prisma.parish.findFirstOrThrow();
      // @ts-expect-error providerWebhookToken está no omit global
      void p.providerWebhookToken;
      const u = await prisma.user.findFirstOrThrow();
      // @ts-expect-error twoFactorSecret está no omit global
      void u.twoFactorSecret;
    };
    expect(typeof typeCheckOnly).toBe('function');
  });

  /**
   * Trava para o futuro: campo novo com cara de segredo no schema precisa
   * entrar no GLOBAL_OMIT ou ser justificado aqui (e no comentário do service).
   */
  it('todo campo com cara de segredo no schema está no omit global ou justificado', () => {
    const allowed: Record<string, string> = {
      'User.password': 'lido sem select na troca de senha (users.service); respostas passam por serializeUser',
      'User.forcePasswordChange': 'flag, não é segredo',
      'User.sessionsRevokedAt': 'data, não é segredo',
      'User.pushTokenUpdatedAt': 'data, não é segredo',
      'RefreshToken.token': 'tabela interna da autenticação, nunca incluída em respostas',
      'PasswordResetToken.tokenHash': 'só o hash; tabela interna',
      'TitheGuestGift.receiptToken': 'devolvido de propósito ao doador visitante',
    };
    const schema = readFileSync(join(__dirname, '..', '..', 'prisma', 'schema.prisma'), 'utf8');
    const suspicious: string[] = [];
    let model = '';
    for (const line of schema.split('\n')) {
      const header = /^model\s+(\w+)\s*\{/.exec(line);
      if (header) {
        model = header[1];
        continue;
      }
      if (/^\}/.test(line)) model = '';
      const field = /^\s+(\w+)\s+(\w+)/.exec(line);
      if (!model || !field) continue;
      // Relações (RefreshToken[], PasswordResetToken[]) não são colunas
      if (!['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(field[2])) continue;
      if (/(secret|token|apikey|password|enc$|hash$|backupcodes)/i.test(field[1])) suspicious.push(`${model}.${field[1]}`);
    }
    const omitted = Object.entries(GLOBAL_OMIT).flatMap(([m, fields]) =>
      Object.keys(fields).map((f) => `${m.charAt(0).toUpperCase()}${m.slice(1)}.${f}`),
    );
    const uncovered = suspicious.filter((name) => !omitted.includes(name) && !allowed[name]);
    expect(uncovered).toEqual([]);
    expect(suspicious).toEqual(expect.arrayContaining(['Parish.providerApiKeyEnc', 'Parish.providerWebhookToken', 'User.twoFactorSecret']));
  });
});
