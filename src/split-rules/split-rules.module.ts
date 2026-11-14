
import { Module } from '@nestjs/common';
import { SplitRulesController } from './split-rules.controller';
import { SplitRulesService } from './split-rules.service';
import { SplitCalculatorService } from './split-calculator.service';

@Module({
  controllers: [SplitRulesController],
  providers: [SplitRulesService, SplitCalculatorService],
  exports: [SplitRulesService, SplitCalculatorService],
})
export class SplitRulesModule {}
