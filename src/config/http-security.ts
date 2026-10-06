import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

/**
 * Cabeçalhos de segurança HTTP (helmet) — achado B5 da auditoria.
 *
 * Mantém o padrão do helmet (nosniff, HSTS, frame-ancestors, CSP restritiva,
 * Referrer-Policy) com um ajuste:
 * - Cross-Origin-Resource-Policy "cross-origin": a API é consumida de outra
 *   origem (painel na Vercel, app). O padrão "same-origin" bloquearia qualquer
 *   <img>/download no-cors apontando para a API. As chamadas do painel (axios,
 *   inclusive PDF/.ics/avatar como blob) são CORS e não dependem disso.
 *
 * A CSP padrão do helmet (default-src 'self'; script-src 'self'; style-src
 * 'self' https: 'unsafe-inline'; img-src 'self' data:) é compatível com o
 * Swagger UI (scripts próprios + <style> inline) e protege anexos servidos
 * "inline": um HTML enviado como anexo não executa script inline nem carrega
 * script de fora.
 */
export function applyHttpSecurity(app: INestApplication): void {
  const http = app.getHttpAdapter().getInstance() as { disable?: (setting: string) => void };
  http.disable?.('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
}

/**
 * Swagger (/api e /api-json) só fora de produção, a menos que
 * SWAGGER_ENABLED=true. Em produção ele entregava o mapa completo da API
 * (rotas administrativas e de plataforma, DTOs) para qualquer pessoa.
 */
export function isSwaggerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SWAGGER_ENABLED !== undefined && env.SWAGGER_ENABLED !== '') {
    return env.SWAGGER_ENABLED === 'true';
  }
  return env.NODE_ENV !== 'production';
}
