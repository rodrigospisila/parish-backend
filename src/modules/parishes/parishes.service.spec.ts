import { Test, TestingModule } from '@nestjs/testing';
import { ParishesService } from './parishes.service';

describe('ParishesService', () => {
  let service: ParishesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParishesService],
    }).compile();

    service = module.get<ParishesService>(ParishesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
