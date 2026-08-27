import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfService } from '../pdf/pdf.service';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { StatementsService } from './statements.service';
import { StatementsController } from './statements.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [FinanceController, StatementsController],
  providers: [FinanceService, StatementsService, PdfService],
})
export class FinanceModule {}
