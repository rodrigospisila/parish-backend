import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { PlanAccessService } from '../plans/plan-access.service';

describe('SchedulesController', () => {
  let controller: SchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulesController],
      // PlanFeatureGuard (planos) precisa do PlanAccessService (global na aplicação)
      providers: [{ provide: SchedulesService, useValue: {} }, { provide: PlanAccessService, useValue: {} }],
    }).compile();

    controller = module.get<SchedulesController>(SchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
