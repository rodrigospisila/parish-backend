import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommunitySuggestionsService } from './community-suggestions.service';
import { CreateCommunitySuggestionDto } from './dto/create-community-suggestion.dto';
import { ReviewCommunitySuggestionDto } from './dto/review-community-suggestion.dto';
import { UserThrottlerGuard } from './user-throttler.guard';

const userIdOf = (user: any): string | null => user?.id ?? user?.userId ?? user?.sub ?? null;

/** Fiel sugere uma correção (qualquer papel logado). Limite: 10 por hora por usuário. */
@Controller('communities/:id/suggestions')
@UseGuards(JwtAuthGuard, UserThrottlerGuard)
export class CommunitySuggestionsController {
  constructor(private readonly service: CommunitySuggestionsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  create(@Param('id') communityId: string, @Body() dto: CreateCommunitySuggestionDto, @CurrentUser() user: any) {
    return this.service.create(communityId, userIdOf(user), dto);
  }
}

/** Revisão das sugestões (SYSTEM_ADMIN). Marcar não aplica nada. */
@Controller('community-suggestions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class CommunitySuggestionsAdminController {
  constructor(private readonly service: CommunitySuggestionsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('kind') kind?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list({
      status,
      kind,
      limit: Number(limit) || undefined,
      offset: Number(offset) || undefined,
    });
  }

  @Patch(':id')
  review(@Param('id') id: string, @Body() dto: ReviewCommunitySuggestionDto, @CurrentUser() user: any) {
    return this.service.review(id, dto, userIdOf(user));
  }
}
