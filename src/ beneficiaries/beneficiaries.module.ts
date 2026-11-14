import { Module } from '@nestjs/common';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { PaystackService } from '../payments/paystack.service';

@Module({
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, PaystackService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
