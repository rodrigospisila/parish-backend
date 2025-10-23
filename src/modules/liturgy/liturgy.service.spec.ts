import { Test, TestingModule } from '@nestjs/testing';
import { LiturgyService } from './liturgy.service';

describe('LiturgyService', () => {
  let service: LiturgyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiturgyService],
    }).compile();

    service = module.get<LiturgyService>(LiturgyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
