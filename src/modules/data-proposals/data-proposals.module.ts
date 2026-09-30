import { Module } from '@nestjs/common';
import { DataProposalsController } from './data-proposals.controller';
import { DataProposalsService } from './data-proposals.service';

/** Fila de propostas de dados levantadas em fonte oficial (aprovação do SYSTEM_ADMIN). */
@Module({
  controllers: [DataProposalsController],
  providers: [DataProposalsService],
})
export class DataProposalsModule {}
