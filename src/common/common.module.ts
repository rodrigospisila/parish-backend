import { Module, Global } from '@nestjs/common';
import { HierarchyService } from './hierarchy.service';
import { PrismaService } from '../database/prisma.service';

@Global()
@Module({
  providers: [HierarchyService, PrismaService],
  exports: [HierarchyService],
})
export class CommonModule {}
