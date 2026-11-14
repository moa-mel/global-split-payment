
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSplitRuleDto } from './dtos/create-split-rule.dto';
import { SplitCalculatorService } from './split-calculator.service';

@Injectable()
export class SplitRulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: SplitCalculatorService,
  ) { }

  async create(merchantId: string, dto: CreateSplitRuleDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const beneficiaryIds = dto.items.map((item) => item.beneficiaryId);

    if (new Set(beneficiaryIds).size !== beneficiaryIds.length) {
      throw new BadRequestException('Duplicate beneficiaries are not allowed');
    }

    const beneficiaries = await this.prisma.beneficiary.findMany({
      where: {
        merchantId,
        id: { in: beneficiaryIds },
        isActive: true,
      },
    });

    if (beneficiaries.length !== beneficiaryIds.length) {
      throw new BadRequestException(
        'Every beneficiary must exist, belong to this merchant, and be active',
      );
    }

    const percentageTotal = dto.items
      .filter((item) => item.splitType === 'PERCENTAGE')
      .reduce((sum, item) => sum + item.value, 0);

    if (percentageTotal > 10000) {
      throw new BadRequestException(
        'Percentage allocations cannot exceed 100%',
      );
    }

    if (
      dto.items.some(
        (item) =>
          !['PERCENTAGE', 'FIXED'].includes(item.splitType) ||
          !Number.isInteger(item.value) ||
          item.value <= 0,
      )
    ) {
      throw new BadRequestException('Invalid split item');
    }

    const splitTypes = new Set(
      dto.items.map((item) => item.splitType),
    );

    if (splitTypes.size > 1) {
      throw new BadRequestException(
        'A Paystack split rule must use either percentage or fixed allocations, not both',
      );
    }

    if (
      dto.items.some(
        (item) =>
          item.splitType === 'PERCENTAGE' &&
          item.value % 100 !== 0,
      )
    ) {
      throw new BadRequestException(
        'Paystack percentage allocations must be whole percentages',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.splitRule.findFirst({
        where: { merchantId },
        orderBy: { version: 'desc' },
      });

      // Rules are versioned. Creating a new one does not rewrite old payments.
      await tx.splitRule.updateMany({
        where: { merchantId, isActive: true },
        data: { isActive: false },
      });

      return tx.splitRule.create({
        data: {
          merchantId,
          name: dto.name,
          description: dto.description,
          version: (latest?.version ?? 0) + 1,
          isActive: true,
          items: {
            create: dto.items.map((item) => ({
              beneficiaryId: item.beneficiaryId,
              splitType: item.splitType,
              value: item.value,
            })),
          },
        },
        include: {
          items: { include: { beneficiary: true } },
        },
      });
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.splitRule.findMany({
      where: { merchantId },
      include: { items: { include: { beneficiary: true } } },
      orderBy: { version: 'desc' },
    });
  }

  async findActive(merchantId: string) {
    const rule = await this.prisma.splitRule.findFirst({
      where: { merchantId, isActive: true },
      include: { items: { include: { beneficiary: true } } },
    });

    if (!rule) {
      throw new NotFoundException('No active split rule found');
    }

    return rule;
  }

  async preview(
    merchantId: string,
    splitRuleId: string,
    amount: number,
  ) {
    const rule = await this.prisma.splitRule.findFirst({
      where: { id: splitRuleId, merchantId },
      include: { items: { include: { beneficiary: true } } },
    });

    if (!rule) {
      throw new NotFoundException('Split rule not found');
    }

    const allocations = this.calculator.calculate(
      BigInt(amount),
      rule.items.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiary.name,
        splitType: item.splitType,
        value: item.value,
      })),
    );

    const allocated = allocations.reduce(
      (sum, item) => sum + item.amount,
      0n,
    );

    return {
      paymentAmount: amount,
      allocatedAmount: allocated.toString(),
      merchantRemainder: (BigInt(amount) - allocated).toString(),
      allocations: allocations.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiaryName,
        amount: item.amount.toString(),
      })),
    };
  }
}
