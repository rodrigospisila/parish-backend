import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  findAll(@Request() req) {
    return this.usersService.findAll(req.user);
  }

  /**
   * Retorna os dados completos do usuário autenticado (incluindo pastorais e roles).
   * IMPORTANTE: Esta rota deve vir ANTES de :id para não ser interpretada como parâmetro.
   */
  @Get('me')
  getMe(@Request() req) {
    return this.usersService.findOne(req.user.id, req.user);
  }

  /**
   * Endpoint para usuário atualizar sua própria comunidade
   * Qualquer usuário autenticado pode usar este endpoint para definir sua comunidade
   * IMPORTANTE: Esta rota deve vir ANTES de :id para não ser interpretada como parâmetro
   */
  @Patch('me/community')
  updateMyCommunity(@Body() body: { communityId: string; consentGiven?: boolean }, @Request() req) {
    return this.usersService.updateMyCommunity(req.user.id, body.communityId, body.consentGiven);
  }

  /**
   * Registra (ou limpa, enviando pushToken: null) o token de push do dispositivo
   * do usuário logado. Usado pelo app mobile após o login/permissão concedida
   * e no logout.
   * IMPORTANTE: Esta rota deve vir ANTES de :id para não ser interpretada como parâmetro
   */
  @Patch('me/push-token')
  updateMyPushToken(@Body() body: { pushToken: string | null }, @Request() req) {
    return this.notificationsService.registerPushToken(req.user.id, body.pushToken);
  }

  /**
   * Exclusão da própria conta (autoatendimento). Sem @Roles: qualquer usuário
   * autenticado pode excluir a si mesmo. Exigido pela App Store e pela LGPD.
   * IMPORTANTE: deve vir ANTES de :id.
   */
  @Delete('me')
  deleteMe(@Request() req) {
    return this.usersService.deleteOwnAccount(req.user.id);
  }

  /** Foto de perfil do próprio usuário. IMPORTANTE: antes de :id. */
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 3 * 1024 * 1024 } }))
  setMyAvatar(@UploadedFile() file: Express.Multer.File, @Request() req) {
    return this.usersService.setMyAvatar(req.user.id, file);
  }

  @Delete('me/avatar')
  removeMyAvatar(@Request() req) {
    return this.usersService.removeMyAvatar(req.user.id);
  }

  /** Foto de perfil de um usuário (qualquer autenticado — exibida em avatares). */
  @Get(':id/avatar')
  async avatar(@Param('id') id: string, @Res() res: Response) {
    const file = await this.usersService.getAvatarFile(id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': String(file.buffer.length),
      // O cliente re-busca com ?t=<versão> após trocar a foto
      'Cache-Control': 'private, max-age=3600',
    });
    res.end(file.buffer);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }

  @Post(':id/change-password')
  changePassword(@Param('id') id: string, @Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    return this.usersService.changePassword(id, changePasswordDto, req.user);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.DIOCESAN_ADMIN, UserRole.PARISH_ADMIN, UserRole.COMMUNITY_COORDINATOR)
  resetPassword(@Param('id') id: string, @Request() req) {
    return this.usersService.resetPassword(id, req.user);
  }
}
