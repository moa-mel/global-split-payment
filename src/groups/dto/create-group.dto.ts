import { IsArray, IsEmail, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MemberDto {
  @IsString() name: string;
  @IsOptional() @IsEmail() email?: string;
}

export class CreateGroupDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(['NGN', 'USD', 'GBP', 'EUR']) currency: string;
  // All monetary values are integer minor units: NGN uses kobo.
  @IsInt() @Min(1) targetAmount: number;
  @IsString() ownerName: string;
  @IsEmail() ownerEmail: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => MemberDto)
  members: MemberDto[];
  @IsOptional() @IsIn(['EQUAL', 'CUSTOM']) contributionMode?: 'EQUAL' | 'CUSTOM';
}
