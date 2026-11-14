import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AiModule } from './ai/ai.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { MerchantsModule } from './merchants/merchants.module';
import { BeneficiariesModule } from './ beneficiaries/beneficiaries.module';
import { SplitRulesModule } from './split-rules/split-rules.module';
import { PaymentsModule } from './payments/payments.module';
import { PayoutsModule } from './payouts/payouts.module';
import { LedgerModule } from './ledger/ledger.module';

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
