import { Test, TestingModule } from '@nestjs/testing';
import { DiocesesController } from './dioceses.controller';

describe('DiocesesController', () => {
  let controller: DiocesesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiocesesController],
    }).compile();

    controller = module.get<DiocesesController>(DiocesesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
