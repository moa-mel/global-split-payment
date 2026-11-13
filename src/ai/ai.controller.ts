import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { BifrostService } from './bifrost.service';

class AssistantDto {
  @IsString() @MinLength(5) message: string;
}

@Controller('ai')
export class AiController {
  constructor(private readonly bifrost: BifrostService) {}

  @Post('draft-group')
  draftGroup(@Body() dto: AssistantDto) {
    return this.bifrost.createGroupDraft(dto.message);
  }

  @Post('assistant')
  assistant(@Body() dto: AssistantDto) {
    return this.bifrost.ask(dto.message);
  }
}
