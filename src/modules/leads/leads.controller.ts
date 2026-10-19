import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

const MINUTE = 60_000;
const HOUR = 3_600_000;

/** Formulário público do site ("Quero na minha paróquia" / demonstração). */
@Controller('public/leads')
export class PublicLeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** POST /public/leads → `{ ok: true, message }` (mesmo corpo para honeypot/duplicado). Limite por IP: 5/min e 20/h. */
  @Post()
  @Throttle({ default: { limit: 5, ttl: MINUTE }, hourly: { limit: 20, ttl: HOUR } })
  create(@Body() dto: CreateLeadDto) {
    return this.leads.createPublic(dto);
  }
}

/** Funil comercial — só SYSTEM_ADMIN (mesmo padrão do PlatformController de planos). */
@Controller('platform/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformLeadsController {
  constructor(private readonly leads: LeadsService) {}

  /** GET /platform/leads?status=NEW&search=&limit=50&offset=0 → `{ items, total, counts, limit, offset }` */
  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.leads.list({ status: status?.trim() || undefined, search, limit: Number(limit), offset: Number(offset) });
  }

  /** PATCH /platform/leads/:id `{ status?, notes? }` */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }
}
