
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitType } from '@prisma/client';

export class CreateSplitRuleItemDto {
  @IsString()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsEnum(SplitType)
  splitType: SplitType;

  @IsInt()
  @Min(1)
  value: number;
}

export class CreateSplitRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitRuleItemDto)
  items: CreateSplitRuleItemDto[];
}
