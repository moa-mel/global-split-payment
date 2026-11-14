import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GroupsModule } from './groups/groups.module';
import { AiModule } from './ai/ai.module';
import { IntelligenceModule } from './intelligence/intelligence.module';

@Module({
  imports: [
    PrismaModule,
    MerchantsModule,
    BeneficiariesModule,
    SplitRulesModule,
    PaymentsModule,
    PayoutsModule,
    LedgerModule,
    AiModule,
    IntelligenceModule,
  ],
})
export class AppModule {}
