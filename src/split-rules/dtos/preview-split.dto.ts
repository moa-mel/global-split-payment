
import { IsInt, IsString, Min } from 'class-validator';

export class PreviewSplitDto {
  @IsString()
  merchantId: string;

  @IsString()
  splitRuleId: string;

  @IsInt()
  @Min(1)
  amount: number;
}
