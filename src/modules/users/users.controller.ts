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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
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

