import { Module } from '@nestjs/common';
import { VisitationService } from './visitation.service';
import { VisitationController } from './visitation.controller';

@Module({
  controllers: [VisitationController],
  providers: [VisitationService],
})
export class VisitationModule {}
