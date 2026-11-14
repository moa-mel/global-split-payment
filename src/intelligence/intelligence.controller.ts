
import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { TavilyService } from './tavily.service';

class ResearchProviderDto {
  @IsString()
  @MinLength(2)
  provider: string;

  @IsOptional()
  @IsString()
  country?: string;
}

class ResearchDto {
  @IsString()
  @MinLength(5)
  query: string;
}

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly tavily: TavilyService) {}

  @Post('providers/research')
  researchProvider(@Body() dto: ResearchProviderDto) {
    return this.tavily.researchProvider(
      dto.provider,
      dto.country ?? 'Nigeria',
    );
  }

  @Post('research')
  research(@Body() dto: ResearchDto) {
    return this.tavily.research(dto.query);
  }
}
