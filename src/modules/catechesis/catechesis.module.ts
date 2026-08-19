import { Module } from '@nestjs/common';
import { CatechesisService } from './catechesis.service';
import { CatechesisController } from './catechesis.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CatechesisController],
  providers: [CatechesisService],
})
export class CatechesisModule {}
