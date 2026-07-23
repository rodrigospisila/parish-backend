import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SwapsService } from './swaps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('swaps')
@UseGuards(JwtAuthGuard)
export class SwapsController {
  constructor(private readonly service: SwapsService) {}

  @Post()
  request(@Body() dto: any, @Request() req: any) {
    return this.service.requestSwap(dto, req.user);
  }

  @Get('mine')
  mine(@Request() req: any) {
    return this.service.listMine(req.user);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @Request() req: any) {
    return this.service.accept(id, req.user);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Request() req: any) {
    return this.service.reject(id, req.user);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.service.cancel(id, req.user);
  }
}
