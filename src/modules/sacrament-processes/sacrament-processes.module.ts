import { Module } from '@nestjs/common';
import { SacramentProcessesService } from './sacrament-processes.service';
import { SacramentProcessesController } from './sacrament-processes.controller';
import { SacramentsModule } from '../sacraments/sacraments.module';

@Module({
  // SacramentCertificateService: certidão comum ao histórico e ao processo
  imports: [SacramentsModule],
  controllers: [SacramentProcessesController],
  providers: [SacramentProcessesService],
})
export class SacramentProcessesModule {}
