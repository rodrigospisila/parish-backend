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
import { ParishesService } from './parishes.service';
import { parsePaging } from '../communities/list-paging';
import { CreateParishDto } from './dto/create-parish.dto';
import { UpdateParishDto } from './dto/update-parish.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('parishes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParishesController {
  constructor(private readonly parishesService: ParishesService) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN)
  create(@Body() createParishDto: CreateParishDto, @CurrentUser() user: any) {
    // DIOCESAN_ADMIN só cria na própria diocese (conferido no service)
    return this.parishesService.create(createParishDto, user);
  }

  /**
   * Sem filtro: lista de gestão no escopo do usuário (fiel sem escopo → vazia).
   * `?dioceseId=`: cascata leve para escolher a paróquia (id, nome, cidade).
   * `?page=&pageSize=&search=` (contrato 4): lista de gestão paginada
   * `{ items, total, page, pageSize }` (pageSize até 100; busca sem acento por
   * nome/cidade; `dioceseId` vira filtro dentro do escopo). Sem `page`,
   * `search` é ignorado e a resposta é a de sempre.
   */
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('dioceseId') dioceseId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const paging = parsePaging(page, pageSize, search);
    if (paging) return this.parishesService.findPage(user, paging, { dioceseId: dioceseId || undefined });
    if (dioceseId) return this.parishesService.listByDiocese(dioceseId);
    return this.parishesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Pedido de encerramento só para quem administra a paróquia (S23)
    return this.parishesService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN)
  update(@Param('id') id: string, @Body() updateParishDto: UpdateParishDto, @CurrentUser() user: any) {
    return this.parishesService.update(id, updateParishDto, user);
  }

  // Exclusão física em cascata (Parish não tem deletedAt): só a plataforma
  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.parishesService.remove(id, user);
  }
}

