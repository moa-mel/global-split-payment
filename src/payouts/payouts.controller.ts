
import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly service: PayoutsService) {}

  @Post()
  initiate(
    @Headers('x-merchant-id') merchantId: string,
    @Body('distributionId') distributionId: string,
  ) {
    return this.service.initiate(merchantId, distributionId);
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
}
