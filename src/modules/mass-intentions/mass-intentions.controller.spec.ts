import { Test, TestingModule } from '@nestjs/testing';
import { MassIntentionsController } from './mass-intentions.controller';

describe('MassIntentionsController', () => {
  let controller: MassIntentionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MassIntentionsController],
    }).compile();

    controller = module.get<MassIntentionsController>(MassIntentionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
