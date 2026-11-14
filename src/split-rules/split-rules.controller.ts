
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { SplitRulesService } from './split-rules.service';
import { CreateSplitRuleDto } from './dtos/create-split-rule.dto';
import { PreviewSplitDto } from './dtos/preview-split.dto';

@Controller('split-rules')
export class SplitRulesController {
  constructor(private readonly service: SplitRulesService) {}

  @Post()
  create(
    @Headers('x-merchant-id') merchantId: string,
    @Body() dto: CreateSplitRuleDto,
  ) {
    return this.service.create(merchantId, dto);
  }

  @Get()
  findAll(@Headers('x-merchant-id') merchantId: string) {
    return this.service.findAll(merchantId);
  }

  @Get('active')
  findActive(@Headers('x-merchant-id') merchantId: string) {
    return this.service.findActive(merchantId);
  }

  @Post('preview')
  preview(@Body() dto: PreviewSplitDto) {
    return this.service.preview(
      dto.merchantId,
      dto.splitRuleId,
      dto.amount,
    );
  }
}
