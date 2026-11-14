import { Module } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { LedgerModule } from '../ledger/ledger.module';
import { SplitCalculatorService } from 'src/split-rules/split-calculator.service';

@Module({
  imports: [LedgerModule],
  providers: [
    PaymentsService,
    SplitCalculatorService,
    PaystackService,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: PaystackService,
    },
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule {}