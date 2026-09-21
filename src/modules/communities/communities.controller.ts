import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CommunitiesMapService, PinKind } from './communities-map.service';
import { CommunitiesReviewService } from './communities-review.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('communities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunitiesController {
  constructor(
    private readonly communitiesService: CommunitiesService,
    private readonly mapService: CommunitiesMapService,
    private readonly reviewService: CommunitiesReviewService,
  ) {}

  // --- Mapa do território (painel do SYSTEM_ADMIN) -------------------------
  // Estas rotas vêm ANTES de @Get(':id'): "map" seria capturado como um id.

  @Get('map/stats')
  @Roles(UserRole.SYSTEM_ADMIN)
  async mapStats(@Query('uf') uf?: string) {
    const [stats, fila] = await Promise.all([this.mapService.stats(uf), this.reviewService.pendingCount()]);
    return { ...stats, fila };
  }

  // Fila de revisão: sugestões de pino que as cargas automáticas não gravaram sozinhas
  @Get('map/review')
  @Roles(UserRole.SYSTEM_ADMIN)
  mapReview(
    @Query('uf') uf?: string,
    @Query('dioceseId') dioceseId?: string,
    @Query('onlyWithMass') onlyWithMass?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reviewService.queue({
      uf,
      dioceseId,
      onlyWithMass: onlyWithMass === '1' || onlyWithMass === 'true',
      limit: Number(limit) || undefined,
      offset: Number(offset) || undefined,
    });
  }

  @Post('geo-candidates/:candidateId/accept')
  @Roles(UserRole.SYSTEM_ADMIN)
  acceptCandidate(@Param('candidateId') candidateId: string, @CurrentUser() user: any) {
    return this.reviewService.accept(candidateId, user?.id ?? user?.userId ?? user?.sub);
  }

  @Post('geo-candidates/:candidateId/reject')
  @Roles(UserRole.SYSTEM_ADMIN)
  rejectCandidate(@Param('candidateId') candidateId: string, @CurrentUser() user: any) {
    return this.reviewService.reject(candidateId, user?.id ?? user?.userId ?? user?.sub);
  }

  @Get('map/dioceses')
  @Roles(UserRole.SYSTEM_ADMIN)
  mapDioceses(@Query('uf') uf?: string) {
    return this.mapService.dioceses(uf);
  }

  @Get('map')
  @Roles(UserRole.SYSTEM_ADMIN)
  map(
    @Query('uf') uf?: string,
    @Query('dioceseId') dioceseId?: string,
    @Query('parishId') parishId?: string,
    @Query('pin') pin?: PinKind | 'todos',
    @Query('q') q?: string,
    @Query('bbox') bbox?: string,
    @Query('limit') limit?: string,
  ) {
    return this.mapService.list({
      uf,
      dioceseId,
      parishId,
      pin,
      q,
      bbox,
      limit: Number(limit) || undefined,
    });
  }

  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
  )
  create(@Body() createCommunityDto: CreateCommunityDto, @CurrentUser() user: any) {
    return this.communitiesService.create(createCommunityDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.communitiesService.findAll(user);
  }

  @Get(':id/geo-candidates')
  @Roles(UserRole.SYSTEM_ADMIN)
  geoCandidates(@Param('id') id: string) {
    return this.reviewService.forCommunity(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.communitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.DIOCESAN_ADMIN,
    UserRole.PARISH_ADMIN,
    UserRole.COMMUNITY_COORDINATOR,
  )
  update(
    @Param('id') id: string,
    @Body() updateCommunityDto: UpdateCommunityDto,
    @CurrentUser() user: any,
  ) {
    return this.communitiesService.update(id, updateCommunityDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.communitiesService.remove(id, user);
  }
}
