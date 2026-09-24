import { Module } from '@nestjs/common';
import {
  CommunitySuggestionsAdminController,
  CommunitySuggestionsController,
} from './community-suggestions.controller';
import { CommunitySuggestionsService } from './community-suggestions.service';
import { UserThrottlerGuard } from './user-throttler.guard';

/** Correções sugeridas pelos fiéis (nunca aplicadas sozinhas) + revisão do SYSTEM_ADMIN. */
@Module({
  controllers: [CommunitySuggestionsController, CommunitySuggestionsAdminController],
  providers: [CommunitySuggestionsService, UserThrottlerGuard],
})
export class CommunitySuggestionsModule {}
