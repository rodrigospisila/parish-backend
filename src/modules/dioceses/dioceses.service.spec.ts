import { Test, TestingModule } from '@nestjs/testing';
import { DiocesesService } from './dioceses.service';

describe('DiocesesService', () => {
  let service: DiocesesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiocesesService],
    }).compile();

    service = module.get<DiocesesService>(DiocesesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
