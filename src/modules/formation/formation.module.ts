import { Module } from '@nestjs/common';
import { FormationService } from './formation.service';
import { FormationController } from './formation.controller';
import { PdfService } from '../pdf/pdf.service';

@Module({
  controllers: [FormationController],
  providers: [FormationService, PdfService],
  exports: [FormationService],
})
export class FormationModule {}
