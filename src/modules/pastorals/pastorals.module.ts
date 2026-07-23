import { Module } from '@nestjs/common';
import { PastoralsService } from './pastorals.service';
import { PastoralsController } from './pastorals.controller';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [PastoralsService, HierarchyService],
  controllers: [PastoralsController],
})
export class PastoralsModule {}
