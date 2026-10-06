import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

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

@Injectable()
export class PrismaService
  extends PrismaClient<{ omit: typeof GLOBAL_OMIT }>
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ omit: GLOBAL_OMIT });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
