import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';

async function bootstrap() {
  // Falha rápido se segredos/configuração de segurança estiverem ausentes
  validateEnv();

  const app = await NestFactory.create(AppModule);
  // Atrás do proxy do Railway: o X-Forwarded-For chega como "<cliente>, <borda do
  // Railway>" e a conexão vem do proxy interno. Com 1 salto, req.ip era o IP da
  // BORDA (2 endereços para todo o Brasil — o limite por IP valia para todos
  // juntos). Com 2 saltos, req.ip é o IP real do cliente.
  app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 2);

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
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
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

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Parish Backend rodando em http://localhost:${port}`);
  console.log(`📖 Documentação da API disponível em http://localhost:${port}/api`);
}

bootstrap();

