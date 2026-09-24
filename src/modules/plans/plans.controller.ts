import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { HierarchyService } from '../../common/hierarchy.service';
import { PlanAccessService } from './plan-access.service';
import { FREE_FEATURES, PAID_FEATURES, hasPaidAccess } from './plan-rules';
import { PlatformPlansService } from './platform-plans.service';
import { PlatformGrowthService } from './platform-growth.service';
import { UpdateCommunityPlanDto } from './dto/update-community-plan.dto';
import { UpsertPlanTierDto } from './dto/upsert-plan-tier.dto';

/** O que a comunidade do usuário logado pode usar (app e painel montam o menu com isto). */
@Controller('me')
@UseGuards(JwtAuthGuard)
export class EntitlementsController {
  constructor(
    private readonly access: PlanAccessService,
    private readonly hierarchy: HierarchyService,
  ) {}

  /**
   * GET /me/entitlements[?communityId=]
   * - `paidAccess`: estado REAL do plano (para avisos/banners);
   * - `features`: o que está liberado AGORA — fora do modo `on` (ou para o
   *   SYSTEM_ADMIN) inclui todos os recursos pagos, pois nada é bloqueado.
   */
  @Get('entitlements')
  async entitlements(@Request() req: any, @Query('communityId') communityIdParam?: string) {
    const user = req.user;
    const enforcement = this.access.enforcement();
    const explicit = communityIdParam?.trim() || null;

    if (explicit && !(await this.hierarchy.isCommunityInScope(user, explicit))) {
      throw new ForbiddenException('Comunidade fora do seu escopo');
    }

    const communityId: string | null = explicit ?? user.communityId ?? null;
    const plan = communityId ? await this.access.getPlan(communityId) : null;
    const paidAccess = explicit
      ? hasPaidAccess(plan)
      : (await this.access.decideForUser({ level: 'community' }, user)).allowed;

    const unlocked = enforcement !== 'on' || user.role === UserRole.SYSTEM_ADMIN || paidAccess;

    return {
      enforcement,
      communityId,
      plan: plan
        ? {
            status: plan.status,
            tierKey: plan.tierKey,
            trialEndsAt: plan.trialEndsAt,
            currentPeriodEnd: plan.currentPeriodEnd,
          }
        : null,
      paidAccess,
      features: [...FREE_FEATURES, ...(unlocked ? PAID_FEATURES : [])],
      paidFeatures: [...PAID_FEATURES],
    };
  }
}

/** Gestão comercial da plataforma — só SYSTEM_ADMIN. */
@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformController {
  constructor(
    private readonly plans: PlatformPlansService,
    private readonly growthService: PlatformGrowthService,
  ) {}

  @Get('plans/summary')
  summary() {
    return this.plans.summary();
  }

  @Get('plans')
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('dioceseId') dioceseId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.plans.list({
      status,
      search,
      state,
      dioceseId,
      limit: Number(limit) || undefined,
      offset: Number(offset) || undefined,
    });
  }

  @Get('plans/:communityId/events')
  events(@Param('communityId') communityId: string) {
    return this.plans.events(communityId);
  }

  @Patch('plans/:communityId')
  update(@Param('communityId') communityId: string, @Body() dto: UpdateCommunityPlanDto, @Request() req: any) {
    return this.plans.update(communityId, dto, req.user?.id ?? null);
  }

  @Get('tiers')
  tiers() {
    return this.plans.listTiers();
  }

  @Put('tiers/:key')
  upsertTier(@Param('key') key: string, @Body() dto: UpsertPlanTierDto) {
    return this.plans.upsertTier(key, dto);
  }

  @Get('growth')
  growth(@Query('days') days?: string) {
    return this.growthService.growth(Number(days) || undefined);
  }
}
