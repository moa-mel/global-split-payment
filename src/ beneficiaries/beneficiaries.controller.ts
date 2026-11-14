
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dtos/create-beneficiary.dto';

@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly service: BeneficiariesService) {}

  @Post()
  create(@Body() dto: CreateBeneficiaryDto) {
    return this.service.create(dto);
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

  @Patch(':id/active')
  setActive(
    @Headers('x-merchant-id') merchantId: string,
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.service.setActive(merchantId, id, isActive);
  }
}
