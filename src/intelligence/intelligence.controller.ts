import { Body, Controller, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { TavilyService } from './tavily.service';

class ResearchDto {
  @IsString() @MinLength(3) query: string;
}

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly tavily: TavilyService) {}
  @Post('providers/research')
  research(@Body() dto: ResearchDto) { return this.tavily.researchProviders(dto.query); }
}
