import { Test, TestingModule } from '@nestjs/testing';
import { PrayerRequestsController } from './prayer-requests.controller';

describe('PrayerRequestsController', () => {
  let controller: PrayerRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrayerRequestsController],
    }).compile();

    controller = module.get<PrayerRequestsController>(PrayerRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
