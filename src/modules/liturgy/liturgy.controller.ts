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
    // Validar formato da data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Formato de data inválido. Use YYYY-MM-DD');
    }
    
    return this.liturgyService.getLiturgyByDate(date);
  }
}

