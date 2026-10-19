import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { describeSlowQuery, slowQueryThresholdMs } from '../common/logging/slow-query';

/**
 * Campos que NUNCA saem do banco numa leitura comum (omit global do Prisma 6).
 *
 * Qualquer `include: { parish: true }`, `findUnique` sem select ou relação
 * aninhada deixa estes campos de fora — uma resposta da API não consegue mais
 * vazá-los por descuido (achado da revisão: GET /events/:id devolvia a Parish
 * inteira com o token do webhook do Asaas). Quem PRECISA lê-los (dízimo,
 * pagamentos, webhooks, 2FA, notificações) usa `select` explícito ou
 * `omit: { campo: false }` — o select explícito ignora o omit global.
 *
 * Avaliados e deixados de fora DE PROPÓSITO (ver prisma.service.spec.ts):
 * - Parish.pixKey: é pública por natureza (vai no BR Code que o fiel paga).
 * - RefreshToken.token, PasswordResetToken.tokenHash, PhoneOtp.code: tabelas
 *   internas da autenticação, nunca incluídas em respostas.
 * - TitheGuestGift.receiptToken: devolvido de propósito ao doador visitante.
 */
export const GLOBAL_OMIT = {
  parish: {
    providerApiKeyEnc: true, // chave da API do provedor (cifrada) — dá acesso à conta de cobrança
    providerWebhookToken: true, // segredo que autentica o webhook do provedor
  },
  user: {
    password: true, // hash bcrypt — só o login e a troca de senha o leem (omit: { password: false })
    twoFactorSecret: true, // semente TOTP (cifrada)
    twoFactorBackupCodes: true, // HMAC dos códigos de recuperação
    pushToken: true, // token Expo: quem o tem manda push para o aparelho
  },
} as const;

/**
 * Opções do client: omit global + evento `query` (só para o aviso de consulta
 * lenta, eng-qualidade-15). Com PRISMA_SLOW_QUERY_MS=0 o evento nem é ligado.
 */
type PrismaServiceOptions = { omit: typeof GLOBAL_OMIT; log: Prisma.LogDefinition[] };

@Injectable()
export class PrismaService
  extends PrismaClient<PrismaServiceOptions>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly slowQueryLogger = new Logger('PrismaSlowQuery');

  constructor() {
    const slowMs = slowQueryThresholdMs();
    super({ omit: GLOBAL_OMIT, log: slowMs > 0 ? [{ emit: 'event', level: 'query' }] : [] });
    if (slowMs > 0) {
      // Só o SQL com marcadores ($1...) — os parâmetros (e.params) nunca vão ao log
      this.$on('query', (event) => {
        if (event.duration > slowMs) this.slowQueryLogger.warn(describeSlowQuery(event));
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
