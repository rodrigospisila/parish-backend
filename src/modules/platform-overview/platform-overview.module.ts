import { Module } from '@nestjs/common';
import { ProductEventsModule } from '../product-events/product-events.module';
import { PlatformOverviewController } from './platform-overview.controller';
import { PlatformOverviewService } from './platform-overview.service';

/** Visão geral do SYSTEM_ADMIN (funil, receita, uso e saúde dos jobs). */
@Module({
  imports: [ProductEventsModule],
  controllers: [PlatformOverviewController],
  providers: [PlatformOverviewService],
})
export class PlatformOverviewModule {}
