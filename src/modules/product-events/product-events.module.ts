import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { PlatformUsageController, ProductEventsController } from './product-events.controller';
import { ProductEventsService } from './product-events.service';

/** Eventos de uso do produto, agregados por dia, sem dado pessoal. */
@Module({
  controllers: [ProductEventsController, PlatformUsageController],
  providers: [ProductEventsService, OptionalJwtAuthGuard],
  // Exportado: outros módulos podem registrar eventos do servidor (record) e o overview lê os totais
  exports: [ProductEventsService],
})
export class ProductEventsModule {}
