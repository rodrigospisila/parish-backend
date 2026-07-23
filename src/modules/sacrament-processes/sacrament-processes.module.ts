import { Module } from '@nestjs/common';
import { SacramentProcessesService } from './sacrament-processes.service';
import { SacramentProcessesController } from './sacrament-processes.controller';
import { PdfService } from '../pdf/pdf.service';

@Module({
  controllers: [SacramentProcessesController],
  providers: [SacramentProcessesService, PdfService],
})
export class SacramentProcessesModule {}
