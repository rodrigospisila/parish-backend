/**
 * Validação de variáveis de ambiente críticas de segurança.
 * A aplicação NÃO deve subir com segredos ausentes, vazios ou placeholders.
 */

const MIN_SECRET_LENGTH = 32;

const PLACEHOLDER_PATTERN = /(your|change|example|placeholder|secret-key|default)/i;

function assertStrongSecret(name: string): void {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(
      `[SEGURANÇA] Variável de ambiente ${name} não definida. ` +
        `Gere um segredo forte (ex.: openssl rand -hex 32) e defina no .env ou no ambiente de deploy.`,
    );
  }

  if (value.trim().length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[SEGURANÇA] ${name} muito curto (mínimo ${MIN_SECRET_LENGTH} caracteres). ` +
        `Gere um segredo forte: openssl rand -hex 32`,
    );
  }

  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(
      `[SEGURANÇA] ${name} parece ser um placeholder. Substitua por um segredo real.`,
    );
  }
}

export function validateEnv(): void {
  assertStrongSecret('JWT_SECRET');
  assertStrongSecret('JWT_REFRESH_SECRET');

  if (!process.env.DATABASE_URL) {
    throw new Error('[SEGURANÇA] DATABASE_URL não definida.');
  }

  // Provedores de pagamento (dízimo D3): opcional — sem a chave, o cadastro de
  // provedor é recusado com mensagem clara em vez de derrubar o servidor
  if (!process.env.PAYMENTS_ENCRYPTION_KEY) {
    console.warn('[AVISO] PAYMENTS_ENCRYPTION_KEY não definida — provedores de pagamento do dízimo ficam indisponíveis.');
  }

  // Em produção, CORS aberto ("*") não é aceitável com credenciais
  if (process.env.NODE_ENV === 'production') {
    const corsOrigin = process.env.CORS_ORIGIN?.trim();
    if (!corsOrigin || corsOrigin === '*') {
      throw new Error(
        '[SEGURANÇA] Em produção, CORS_ORIGIN deve listar explicitamente as origens permitidas (separadas por vírgula).',
      );
    }
  }
}
