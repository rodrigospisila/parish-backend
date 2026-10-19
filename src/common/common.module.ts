import { Module, Global } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { ScheduleConflictsService } from './schedule-conflicts.service';
import { PrismaService } from '../database/prisma.service';
import { EnforcementHitsService } from './enforcement-hits.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [HierarchyService, AuditService, ScheduleConflictsService, PrismaService, EnforcementHitsService],
  exports: [HierarchyService, AuditService, ScheduleConflictsService, EnforcementHitsService],
})
export class CommonModule {}
