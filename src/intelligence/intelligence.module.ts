
import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { TavilyService } from './tavily.service';

@Module({
  controllers: [IntelligenceController],
  providers: [TavilyService],
  exports: [TavilyService],
})
export class IntelligenceModule {}
