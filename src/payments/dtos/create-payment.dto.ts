import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  currency: string;

  @IsEmail()
  customerEmail: string;

  @IsOptional()
  @IsString()
  splitRuleId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}