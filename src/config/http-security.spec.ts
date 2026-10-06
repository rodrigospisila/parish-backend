import { Controller, Get, INestApplication, Res } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Response } from 'express';
import request from 'supertest';
import { applyHttpSecurity, isSwaggerEnabled } from './http-security';

@Controller()
class FakeController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('api/v1/doc.pdf')
  pdf(@Res() res: Response) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="doc.pdf"');
    res.end(Buffer.from('%PDF-1.4\n'));
  }
}

describe('http-security (helmet + Swagger condicional)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ controllers: [FakeController] }).compile();
    app = mod.createNestApplication();
    applyHttpSecurity(app);
    app.enableCors({ origin: ['https://painel.exemplo'], credentials: true, exposedHeaders: ['Retry-After'] });
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, new DocumentBuilder().build()));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('manda nosniff, HSTS, frame-ancestors e sem X-Powered-By', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=\d+/);
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'self'");
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
    // a API é consumida de outra origem (painel/app)
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('não quebra o CORS (preflight e Retry-After exposto)', async () => {
    const pre = await request(app.getHttpServer())
      .options('/health')
      .set('Origin', 'https://painel.exemplo')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    expect(pre.status).toBe(204);
    expect(pre.headers['access-control-allow-origin']).toBe('https://painel.exemplo');
    expect(pre.headers['access-control-allow-credentials']).toBe('true');

    const res = await request(app.getHttpServer()).get('/health').set('Origin', 'https://painel.exemplo');
    expect(res.headers['access-control-allow-origin']).toBe('https://painel.exemplo');
    expect(res.headers['access-control-expose-headers']).toContain('Retry-After');
  });

  it('PDF inline continua saindo com o Content-Type e o Content-Disposition do controller', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/doc.pdf').expect(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('inline');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('Swagger UI (quando ligado) carrega com a CSP: scripts próprios e <style> inline permitidos', async () => {
    const html = await request(app.getHttpServer()).get('/api').expect(200);
    const csp = String(html.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toMatch(/style-src 'self' https: 'unsafe-inline'/);
    expect(html.text).not.toMatch(/<script>(?!\s*<\/script>)/); // nenhum script inline
    const init = await request(app.getHttpServer()).get('/api/swagger-ui-init.js');
    expect(init.status).toBe(200);
  });

  describe('isSwaggerEnabled', () => {
    it('desligado em produção por padrão', () => {
      expect(isSwaggerEnabled({ NODE_ENV: 'production' })).toBe(false);
    });
    it('ligado em produção só com SWAGGER_ENABLED=true', () => {
      expect(isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
      expect(isSwaggerEnabled({ NODE_ENV: 'production', SWAGGER_ENABLED: '1' })).toBe(false);
    });
    it('ligado fora de produção (dev/test), salvo SWAGGER_ENABLED=false', () => {
      expect(isSwaggerEnabled({})).toBe(true);
      expect(isSwaggerEnabled({ NODE_ENV: 'development' })).toBe(true);
      expect(isSwaggerEnabled({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' })).toBe(false);
    });
  });
});
