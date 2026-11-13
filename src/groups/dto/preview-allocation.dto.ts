import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AllocationLineDto {
  @IsString() recipientId: string;
  @IsInt() @Min(1) amount: number;
}
export class PreviewAllocationDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => AllocationLineDto)
  allocations: AllocationLineDto[];
}
