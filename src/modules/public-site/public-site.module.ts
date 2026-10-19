import { Module } from '@nestjs/common';
import { PublicSiteController } from './public-site.controller';
import { PublicSiteService } from './public-site.service';

/** Dados públicos do site de vendas (planos) e configuração de versão do app. */
@Module({
  controllers: [PublicSiteController],
  providers: [PublicSiteService],
})
export class PublicSiteModule {}
