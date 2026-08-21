import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

/** Histórico de avisos do PRÓPRIO usuário (reler o que chegou por push). */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mine')
  async mine(@Request() req: any, @Query('type') type?: string) {
    const where: any = { userId: req.user.id };
    if (type && Object.values(NotificationType).includes(type as NotificationType)) {
      where.type = type;
    }
    return this.prisma.notification.findMany({
      where,
      select: { id: true, type: true, title: true, body: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
