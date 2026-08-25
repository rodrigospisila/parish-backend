import { Module } from '@nestjs/common';
import { PastoralsService } from './pastorals.service';
import { PastoralsController } from './pastorals.controller';
import { HierarchyService } from '../../common/hierarchy.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommonModule } from '../../common/common.module';
import { JoinRequestsService } from './join-requests.service';
import { JoinRequestsController } from './join-requests.controller';

@Module({
  imports: [NotificationsModule, CommonModule],
  providers: [PastoralsService, HierarchyService, JoinRequestsService],
  controllers: [PastoralsController, JoinRequestsController],
})
export class PastoralsModule {}
