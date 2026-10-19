import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { OptionalJwtAuthGuard } from '../invites/optional-jwt.guard';
import { ClaimsService } from './claims.service';
import {
  CreateClaimDto,
  ListClaimsQueryDto,
  ReviewClaimDto,
  SendClaimCodeDto,
  VerifyClaimCodeDto,
} from './dto/claims.dto';

const MINUTE = 60_000;
const HOUR = 3_600_000;

/** Limite por e-mail do corpo (o mesmo pedido vindo de vários IPs). */
export const claimEmailTracker = (req: Record<string, any>): string => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return email ? `email:${email}` : `ip:${req.ip}`;
};

/** Limite por pedido (envio de código ao contato oficial da paróquia). */
export const claimIdTracker = (req: Record<string, any>): string => {
  const id = typeof req.params?.claimId === 'string' ? req.params.claimId : '';
  return id ? `claim:${id}` : `ip:${req.ip}`;
};

/**
 * Reivindicação de paróquia (C1) — rotas públicas, limitadas por IP (guard
 * global) e, onde dispara envio, também por alvo. Nunca devolvem dado pessoal
 * de terceiros: o contato oficial da paróquia sai mascarado.
 */
@Controller()
export class PublicClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Get('public/parishes/:parishId/claim-info')
  @Throttle({ default: { limit: 60, ttl: MINUTE } })
  claimInfo(@Param('parishId') parishId: string) {
    return this.claims.claimInfo(parishId);
  }

  /** Sem login; com Bearer, o pedido fica ligado à conta. 5/min e 10/h por IP; 5/h por e-mail. */
  @Post('public/parishes/:parishId/claims')
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({
    default: { limit: 5, ttl: MINUTE },
    hourly: { limit: 10, ttl: HOUR },
    target: { limit: 5, ttl: HOUR, getTracker: claimEmailTracker },
  })
  create(@Param('parishId') parishId: string, @Body() dto: CreateClaimDto, @Request() req) {
    return this.claims.create(parishId, dto, req.user ?? null);
  }

  /** Dispara SMS/e-mail ao contato OFICIAL: 3/min e 10/h por IP; 3/h por pedido (o serviço limita 3 no total). */
  @Post('public/claims/:claimId/send-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 3, ttl: MINUTE },
    hourly: { limit: 10, ttl: HOUR },
    target: { limit: 3, ttl: HOUR, getTracker: claimIdTracker },
  })
  sendCode(@Param('claimId') claimId: string, @Body() dto: SendClaimCodeDto) {
    return this.claims.sendCode(claimId, dto.channel);
  }

  @Post('public/claims/:claimId/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: 10, ttl: MINUTE },
    hourly: { limit: 30, ttl: HOUR },
  })
  verify(@Param('claimId') claimId: string, @Body() dto: VerifyClaimCodeDto) {
    return this.claims.verifyCode(claimId, dto.code);
  }
}

/** Fila de reivindicações (SYSTEM_ADMIN). */
@Controller('platform/claims')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Get()
  list(@Query() query: ListClaimsQueryDto) {
    return this.claims.list(query.status);
  }

  @Patch(':id')
  review(@Param('id') id: string, @Body() dto: ReviewClaimDto, @Request() req) {
    return this.claims.review(id, dto, req.user);
  }
}
