import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../database/prisma.module';
import { PrismaService } from '../../database/prisma.service';
import { PlansModule } from '../plans/plans.module';
import { BillingModule } from './billing.module';
import { BillingService } from './billing.service';
import { BillingWebhookService } from './billing-webhook.service';

describe('BillingModule', () => {
  it('monta com as dependências reais (sem ciclo de módulos)', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }), PrismaModule, CommonModule, PlansModule, BillingModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    expect(moduleRef.get(BillingService)).toBeInstanceOf(BillingService);
    expect(moduleRef.get(BillingWebhookService)).toBeInstanceOf(BillingWebhookService);
    await moduleRef.close();
  });
});
