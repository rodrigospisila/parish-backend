// Primeiro de tudo: o Sentry (só com SENTRY_DSN) precisa subir antes do resto
import type { NestExpressApplication } from '@nestjs/platform-express';
import { initSentry } from './common/filters/sentry';
initSentry();

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';
import { applyHttpSecurity, isSwaggerEnabled } from './config/http-security';
import { REQUEST_ID_HEADER, requestIdMiddleware } from './common/request-id';
import { isJsonLogFormat, JsonLogger } from './common/logging/json-logger';
import { createRequestLoggingMiddleware } from './common/logging/request-logging.middleware';

async function bootstrap() {
  // Falha rápido se segredos/configuração de segurança estiverem ausentes
  validateEnv();

  // LOG_FORMAT=json: logs em JSON (nível, contexto, mensagem, requestId) e uma
  // linha por requisição (eng-qualidade-15). Sem a env, o formato não muda.
  const jsonLogs = isJsonLogFormat();
  const jsonLogger = jsonLogs ? new JsonLogger() : null;
  const app = await NestFactory.create<NestExpressApplication>(AppModule, jsonLogger ? { logger: jsonLogger } : {});
  // Importação de planilha (até 2.000 linhas por chamada) passa do padrão de 100 KB
  app.useBodyParser('json', { limit: '2mb' });
  // Atrás do proxy do Railway: o X-Forwarded-For chega como "<cliente>, <borda do
  // Railway>" e a conexão vem do proxy interno. Com 1 salto, req.ip era o IP da
  // BORDA (2 endereços para todo o Brasil — o limite por IP valia para todos
  // juntos). Com 2 saltos, req.ip é o IP real do cliente.
  app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 2);
  // helmet (nosniff, HSTS, CSP, frame-ancestors) e sem X-Powered-By — ver config/http-security.ts
  applyHttpSecurity(app);
  // Código de rastreio (X-Request-Id) em toda resposta; o filtro global de
  // erros (AllExceptionsFilter, no AppModule) o repete no corpo do erro
  app.use(requestIdMiddleware);
  if (jsonLogger) app.use(createRequestLoggingMiddleware(jsonLogger));

  // Global prefix (o /health fica fora do prefixo para o healthcheck do Railway)
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] });

  // CORS: origens explícitas via env. Sem CORS_ORIGIN definido, permite
  // apenas localhost (desenvolvimento) — nunca "*" com credentials.
  const corsOrigins = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins?.length
      ? corsOrigins
      : [/^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/],
    credentials: true,
    // O painel lê o tempo de espera do 429 e o código de rastreio do erro
    // (sem isso o navegador esconde os cabeçalhos)
    exposedHeaders: ['Retry-After', REQUEST_ID_HEADER, 'X-Document-Kind', 'Content-Disposition'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation — desligado em produção (NODE_ENV=production) a menos
  // que SWAGGER_ENABLED=true
  const swaggerEnabled = isSwaggerEnabled();
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Parish API')
      .setDescription('API do sistema Parish - Plataforma de gestão para dioceses, paróquias e comunidades católicas')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticação e autorização')
      .addTag('users', 'Gestão de usuários')
      .addTag('dioceses', 'Gestão de dioceses')
      .addTag('parishes', 'Gestão de paróquias')
      .addTag('communities', 'Gestão de comunidades')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);

  if (jsonLogs) {
    const bootLogger = new Logger('Bootstrap');
    bootLogger.log(`Parish Backend rodando na porta ${port}`);
    if (swaggerEnabled) bootLogger.log('Documentação da API disponível em /api');
  } else {
    console.log(`🚀 Parish Backend rodando em http://localhost:${port}`);
    if (swaggerEnabled) console.log(`📖 Documentação da API disponível em http://localhost:${port}/api`);
  }
}

bootstrap();

