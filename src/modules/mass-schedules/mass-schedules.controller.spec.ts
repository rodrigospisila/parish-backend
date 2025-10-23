import { Test, TestingModule } from '@nestjs/testing';
import { MassSchedulesController } from './mass-schedules.controller';

describe('MassSchedulesController', () => {
  let controller: MassSchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MassSchedulesController],
    }).compile();

    controller = module.get<MassSchedulesController>(MassSchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
