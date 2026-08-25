import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PdfService } from '../pdf/pdf.service';
import { TitheService } from './tithe.service';
import { TitheController } from './tithe.controller';

@Module({
  imports: [CommonModule, NotificationsModule],
  providers: [TitheService, PdfService],
  controllers: [TitheController],
})
export class TitheModule {}
