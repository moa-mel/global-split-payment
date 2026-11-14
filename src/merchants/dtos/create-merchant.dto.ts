
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
