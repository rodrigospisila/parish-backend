import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
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
import { UserThrottlerGuard } from '../auth/guards/app-throttler.guard';
import { InvitesService } from './invites.service';
import { CreateInviteDto, ListInvitesQueryDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { OptionalJwtAuthGuard } from './optional-jwt.guard';

const MINUTE = 60_000;
const HOUR = 3_600_000;

/**
 * Convites de equipe por link (C2 — saas-implantacao-10 / ux-acesso-05).
 * Quem convida precisa poder criar um usuário com aquele papel e escopo
 * (régua do POST /users, conferida no serviço). Freio por usuário.
 */
@Controller('invites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  create(@Body() dto: CreateInviteDto, @Request() req) {
    return this.invites.create(dto, req.user);
  }

  @Get()
  list(@Query() query: ListInvitesQueryDto, @Request() req) {
    return this.invites.list(query, req.user);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: MINUTE } })
  resend(@Param('id') id: string, @Request() req) {
    return this.invites.resend(id, req.user);
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @Request() req) {
    return this.invites.revoke(id, req.user);
  }
}

/**
 * Link do convite (sem login). O token é segredo de 256 bits: inválido,
 * usado, cancelado ou vencido respondem 410 com a mensagem para a pessoa.
 * Freio por IP (guard global).
 */
@Controller('public/invites')
export class PublicInvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get(':token')
  @Throttle({ default: { limit: 30, ttl: MINUTE } })
  show(@Param('token') token: string) {
    return this.invites.getPublic(token);
  }

  /**
   * Cria a conta (ou aplica o papel na conta do Bearer) e devolve o mesmo
   * corpo do POST /auth/login. 10/min e 30/h por IP.
   */
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({
    default: { limit: 10, ttl: MINUTE },
    hourly: { limit: 30, ttl: HOUR },
  })
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptInviteDto,
    @Request() req,
    @Headers() headers: Record<string, string | undefined>,
    @Ip() ip: string,
  ) {
    return this.invites.accept(token, dto, req.user ?? null, {
      ip,
      userAgent: headers['user-agent'] ?? null,
      deviceId: headers['x-device-id'] ?? null,
      deviceName: headers['x-device-name'] ?? null,
    });
  }
}
