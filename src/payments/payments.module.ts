
import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaystackService } from './paystack.service';
import { SplitCalculatorService } from '../split-rules/split-calculator.service';
import { LedgerModule } from '../ledger/ledger.module';
import { PaystackWebhookController } from './paystack-webhook.controller';

@Module({
  imports: [LedgerModule],
  controllers: [PaymentsController,
    PaystackWebhookController,
  ],
  providers: [
    PaymentsService,
    PaystackService,
    SplitCalculatorService,
  ],
  exports: [PaymentsService, PaystackService],
})
export class PaymentsModule {}
