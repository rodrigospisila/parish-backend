import { Test, TestingModule } from '@nestjs/testing';
import { ParishesController } from './parishes.controller';

describe('ParishesController', () => {
  let controller: ParishesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParishesController],
    }).compile();

    controller = module.get<ParishesController>(ParishesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
