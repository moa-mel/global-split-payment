import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { PAYMENT_PROVIDER } from './payment-provider.interface';
import { LedgerModule } from '../ledger/ledger.module';
import { SplitCalculatorService } from '../split-rules/split-calculator.service';

@Module({
  imports: [LedgerModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    SplitCalculatorService,
    PaystackService,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: PaystackService,
    },
  ],
  exports: [
    PaymentsService,
    PAYMENT_PROVIDER,
  ],
})
export class PaymentsModule {}