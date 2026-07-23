import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PASTORAL_COORDINATOR)
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  list(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('communityId') communityId?: string,
    @Query('communityPastoralId') communityPastoralId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.list(req.user, {
      category,
      communityId,
      communityPastoralId,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: any) {
    return this.service.getWithVersions(id, req.user);
  }

  @Post(':id/versions')
  addVersion(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.service.addVersion(id, dto, req.user);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Body() body: { isArchived: boolean }, @Request() req: any) {
    return this.service.archive(id, body.isArchived, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user);
  }
}
