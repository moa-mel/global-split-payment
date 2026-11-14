
import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { BifrostService } from './bifrost.service';

class DraftSplitRuleDto {
  @IsString()
  @MinLength(5)
  instruction: string;

  @IsOptional()
  @IsString()
  currency?: string;
}

class AssistantDto {
  @IsString()
  @MinLength(2)
  question: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly bifrost: BifrostService) {}

  @Post('draft-split-rule')
  draftSplitRule(@Body() dto: DraftSplitRuleDto) {
    return this.bifrost.draftSplitRule(
      dto.instruction,
      dto.currency ?? 'NGN',
    );
  }

  @Post('assistant')
  assistant(@Body() dto: AssistantDto) {
    return this.bifrost.assistant(dto.question);
  }
}
