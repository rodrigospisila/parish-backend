import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PdfService } from '../pdf/pdf.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PdfService],
})
export class ReportsModule {}
