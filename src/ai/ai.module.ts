import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { BifrostService } from './bifrost.service';

@Module({ controllers: [AiController], providers: [BifrostService], exports: [BifrostService] })
export class AiModule {}
