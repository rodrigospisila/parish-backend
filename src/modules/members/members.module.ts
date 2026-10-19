import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { MemberImportService } from './member-import.service';
import { PaymentsModule } from '../payments/payments.module';
import { TitheScheduleCancellationService } from '../tithe/tithe-schedule-cancellation.service';

@Module({
  // Só a fábrica de provedores (sem o TitheModule): anonimizar cancela o dízimo automático
  imports: [PaymentsModule],
  providers: [MembersService, MemberImportService, TitheScheduleCancellationService],
  controllers: [MembersController],
  exports: [MembersService],
})
export class MembersModule {}
