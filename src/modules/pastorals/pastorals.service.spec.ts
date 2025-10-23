import { Test, TestingModule } from '@nestjs/testing';
import { PastoralsService } from './pastorals.service';

describe('PastoralsService', () => {
  let service: PastoralsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PastoralsService],
    }).compile();

    service = module.get<PastoralsService>(PastoralsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
