import { BadRequestException, Injectable } from '@nestjs/common';
import { AsaasProvider } from './asaas.provider';
import { MercadoPagoProvider } from './mercadopago.provider';
import { decryptSecret, encryptSecret, generateWebhookToken, isPaymentsCryptoConfigured, paymentsCryptoProblem } from './payment-crypto';
import { PaymentProvider, ProviderName } from './payment-provider.interface';

export interface ParishProviderConfig {
  paymentProvider: string | null;
  providerEnv: string | null;
  providerApiKeyEnc: string | null;
  providerWebhookToken: string | null;
}

/**
 * Fábrica de provedores por paróquia: cada paróquia tem seu próprio provedor,
 * chave (cifrada em repouso) e token de webhook. O domínio do dízimo pede
 * `forParish(config)` e fala só com a interface PaymentProvider.
 */
@Injectable()
export class PaymentsService {
  isConfigured(): boolean {
    return isPaymentsCryptoConfigured();
  }

  /** Motivo exato de a criptografia não estar pronta (ausente × formato inválido). */
  cryptoProblem(): string | null {
    return paymentsCryptoProblem();
  }

  encryptApiKey(apiKey: string): string {
    const problem = this.cryptoProblem();
    if (problem) {
      throw new BadRequestException(`Servidor sem criptografia de segredos: ${problem}`);
    }
    return encryptSecret(apiKey.trim());
  }

  newWebhookToken(): string {
    return generateWebhookToken();
  }

  /**
   * Mercado Pago gera a assinatura secreta do webhook no painel dele (o admin
   * cola no Parish); Asaas aceita um token que o Parish gera e o admin cola lá.
   */
  webhookSecretManagedByAdmin(provider: string | null | undefined): boolean {
    return provider === 'MERCADOPAGO';
  }

  hasProvider(config: ParishProviderConfig): config is ParishProviderConfig & { paymentProvider: ProviderName } {
    return (config.paymentProvider === 'ASAAS' || config.paymentProvider === 'MERCADOPAGO') && !!config.providerApiKeyEnc;
  }

  forParish(config: ParishProviderConfig, opts: { verifyOnly?: boolean } = {}): PaymentProvider {
    if (!this.hasProvider(config)) {
      throw new BadRequestException('A paróquia não tem provedor de pagamento configurado');
    }
    const env = config.providerEnv === 'production' ? 'production' : 'sandbox';
    // verifyOnly: só para validar webhook — não decifra a chave de API
    const apiKey = opts.verifyOnly ? '' : decryptSecret(config.providerApiKeyEnc!);
    const credentials = { apiKey, env, webhookSecret: config.providerWebhookToken } as const;
    switch (config.paymentProvider) {
      case 'ASAAS':
        return new AsaasProvider(credentials);
      case 'MERCADOPAGO':
        return new MercadoPagoProvider(credentials);
      default:
        throw new BadRequestException('Provedor de pagamento desconhecido');
    }
  }
}
