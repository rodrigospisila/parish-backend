import { Module } from '@nestjs/common';
import { SacramentsService } from './sacraments.service';
import { SacramentsController } from './sacraments.controller';
import { SacramentCertificateService } from './sacrament-certificate.service';
import { PdfService } from '../pdf/pdf.service';

@Module({
  controllers: [SacramentsController],
  providers: [SacramentsService, SacramentCertificateService, PdfService],
  exports: [SacramentsService, SacramentCertificateService],
})
export class SacramentsModule {}
