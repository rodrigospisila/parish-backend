import { Module, Global } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  controllers: [AuditController],
  providers: [HierarchyService, AuditService, PrismaService],
  exports: [HierarchyService, AuditService],
})
export class CommonModule {}
