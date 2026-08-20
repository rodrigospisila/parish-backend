import { Module } from '@nestjs/common';
import { CatechesisService } from './catechesis.service';
import { CatechesisController } from './catechesis.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfService } from '../pdf/pdf.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CatechesisController],
  providers: [CatechesisService, PdfService],
})
export class CatechesisModule {}
