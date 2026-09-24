import { Global, Module } from '@nestjs/common';
import { PlanAccessService } from './plan-access.service';
import { PlanFeatureGuard } from './plan-feature.guard';
import { PlatformPlansService } from './platform-plans.service';
import { PlatformGrowthService } from './platform-growth.service';
import { EntitlementsController, PlatformController } from './plans.controller';

/**
 * Planos da plataforma por comunidade. Global para que o `PlanFeatureGuard`
 * (usado nos controllers dos módulos pagos) resolva o PlanAccessService em
 * qualquer módulo sem import explícito.
 */
@Global()
@Module({
  controllers: [EntitlementsController, PlatformController],
  providers: [PlanAccessService, PlanFeatureGuard, PlatformPlansService, PlatformGrowthService],
  exports: [PlanAccessService, PlanFeatureGuard],
})
export class PlansModule {}
