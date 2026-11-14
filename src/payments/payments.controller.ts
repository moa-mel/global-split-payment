
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) { }

  @Post()
  create(
    @Headers('x-merchant-id') merchantId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.service.create(merchantId, dto);
  }

  @Get()
  findAll(@Headers('x-merchant-id') merchantId: string) {
    return this.service.findAll(merchantId);
  }

  @Get(':id')
  findOne(
    @Headers('x-merchant-id') merchantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findOne(merchantId, id);
  }

  @Post(':reference/confirm-sandbox')
  confirmSandbox(@Param('reference') reference: string) {
    return this.service.confirmPayment(reference);
  }

  @Get(':reference/verify')
  verify(@Param('reference') reference: string) {
    return this.service.verifyAndConfirm(reference);
  }
}
