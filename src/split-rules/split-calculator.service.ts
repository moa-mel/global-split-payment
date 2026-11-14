
import { BadRequestException, Injectable } from '@nestjs/common';
import { SplitType } from '@prisma/client';

export interface SplitInput {
  beneficiaryId: string;
  beneficiaryName: string;
  splitType: SplitType;
  value: number;
}

export interface SplitOutput {
  beneficiaryId: string;
  beneficiaryName: string;
  amount: bigint;
}

@Injectable()
export class SplitCalculatorService {
  calculate(total: bigint, items: SplitInput[]): SplitOutput[] {
    if (total <= 0n) {
      throw new BadRequestException('Payment amount must be positive');
    }

    if (!items.length) {
      throw new BadRequestException('The split rule has no beneficiaries');
    }

    const ids = items.map((item) => item.beneficiaryId);

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        'A beneficiary can only appear once in a split rule',
      );
    }

    let percentageTotal = 0;
    let fixedTotal = 0n;

    for (const item of items) {
      if (!Number.isInteger(item.value) || item.value <= 0) {
        throw new BadRequestException('Split values must be positive integers');
      }

      if (item.splitType === SplitType.PERCENTAGE) {
        percentageTotal += item.value;
      } else {
        fixedTotal += BigInt(item.value);
      }
    }

    if (percentageTotal > 10000) {
      throw new BadRequestException(
        'Percentage allocations cannot exceed 100%',
      );
    }

    if (fixedTotal > total) {
      throw new BadRequestException(
        'Fixed allocations exceed the payment amount',
      );
    }

    const remaining = total - fixedTotal;
    const outputs: SplitOutput[] = [];
    let allocatedPercentage = 0n;

    const percentageItems = items.filter(
      (item) => item.splitType === SplitType.PERCENTAGE,
    );

    percentageItems.forEach((item, index) => {
      const isLast = index === percentageItems.length - 1;
      const amount = isLast
        ? (remaining * BigInt(percentageTotal) / 10000n) -
          allocatedPercentage
        : (remaining * BigInt(item.value)) / 10000n;

      allocatedPercentage += amount;

      outputs.push({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiaryName,
        amount,
      });
    });

    for (const item of items.filter(
      (entry) => entry.splitType === SplitType.FIXED,
    )) {
      outputs.push({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiaryName,
        amount: BigInt(item.value),
      });
    }

    return outputs.filter((item) => item.amount > 0n);
  }
}
