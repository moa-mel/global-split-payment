
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SplitRuleItemDto {
  @IsString()
  beneficiaryId: string;

  @IsString()
  splitType: 'PERCENTAGE' | 'FIXED';

  @IsInt()
  @Min(1)
  value: number;
}

export class CreateSplitRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitRuleItemDto)
  items: SplitRuleItemDto[];
}
