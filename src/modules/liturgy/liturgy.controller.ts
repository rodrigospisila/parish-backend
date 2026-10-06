import { Controller, Get, Param } from '@nestjs/common';
import { LiturgyService, LiturgyData } from './liturgy.service';

@Controller('liturgy')
export class LiturgyController {
  constructor(private readonly liturgyService: LiturgyService) {}

  @Get('today')
  getTodayLiturgy(): Promise<LiturgyData> {
    return this.liturgyService.getTodayLiturgy();
  }

  @Get(':date')
  getLiturgyByDate(@Param('date') date: string): Promise<LiturgyData> {
    // Formato AAAA-MM-DD e data real; inválida é 400 (antes: Error cru → 500)
    return this.liturgyService.getLiturgyByDate(LiturgyService.assertValidDate(date));
  }
}
