import { Test, TestingModule } from '@nestjs/testing';
import { MassIntentionsService } from './mass-intentions.service';

describe('MassIntentionsService', () => {
  let service: MassIntentionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MassIntentionsService],
    }).compile();

    service = module.get<MassIntentionsService>(MassIntentionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
