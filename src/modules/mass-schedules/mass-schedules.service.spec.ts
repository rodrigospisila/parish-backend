import { Test, TestingModule } from '@nestjs/testing';
import { MassSchedulesService } from './mass-schedules.service';

describe('MassSchedulesService', () => {
  let service: MassSchedulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MassSchedulesService],
    }).compile();

    service = module.get<MassSchedulesService>(MassSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
