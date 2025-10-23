import { Test, TestingModule } from '@nestjs/testing';
import { PastoralsController } from './pastorals.controller';

describe('PastoralsController', () => {
  let controller: PastoralsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PastoralsController],
    }).compile();

    controller = module.get<PastoralsController>(PastoralsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
