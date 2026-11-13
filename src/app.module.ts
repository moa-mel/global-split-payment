import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { GroupsModule } from './groups/groups.module';
import { AiModule } from './ai/ai.module';
import { IntelligenceModule } from './intelligence/intelligence.module';

@Module({
  imports: [PrismaModule, GroupsModule, AiModule, IntelligenceModule],
})
export class AppModule {}
