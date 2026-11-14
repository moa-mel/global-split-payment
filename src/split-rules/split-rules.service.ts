
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

  private serializeRule<
    T extends {
      items: Array<{
        type: string;
        value: bigint;
      }>;
    },
  >(rule: T) {
    return {
      ...rule,
      items: rule.items.map(({ type, value, ...item }) => ({
        ...item,
        splitType: type,
        value: Number(value),
      })),
    };
  }

  async create(merchantId: string, dto: CreateSplitRuleDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'At least one split allocation is required',
      );
    }

    const beneficiaryIds = dto.items.map(
      (item) => item.beneficiaryId,
    );

    if (
      new Set(beneficiaryIds).size !== beneficiaryIds.length
    ) {
      throw new BadRequestException(
        'Duplicate beneficiaries are not allowed',
      );
    }

    // Validate individual split values before performing calculations.
    for (const item of dto.items) {
      if (
        !['PERCENTAGE', 'FIXED'].includes(item.splitType) ||
        !Number.isSafeInteger(item.value) ||
        item.value <= 0
      ) {
        throw new BadRequestException(
          'Every split item must have a valid split type and positive integer value',
        );
      }
    }

    const splitTypes = new Set(
      dto.items.map((item) => item.splitType),
    );

    if (splitTypes.size !== 1) {
      throw new BadRequestException(
        'A Paystack split rule must use either percentage or fixed allocations, not both',
      );
    }

    const splitType = dto.items[0].splitType;

    if (splitType === 'PERCENTAGE') {
      const percentageTotal = dto.items.reduce(
        (sum, item) => sum + item.value,
        0,
      );

      if (percentageTotal > 10000) {
        throw new BadRequestException(
          'Percentage allocations cannot exceed 100%',
        );
      }

      if (
        dto.items.some((item) => item.value % 100 !== 0)
      ) {
        throw new BadRequestException(
          'Paystack percentage allocations must be whole percentages',
        );
      }
    }

    const beneficiaries =
      await this.prisma.beneficiary.findMany({
        where: {
          merchantId,
          id: {
            in: beneficiaryIds,
          },
          isActive: true,
        },
      });

    if (beneficiaries.length !== beneficiaryIds.length) {
      throw new BadRequestException(
        'Every beneficiary must exist, belong to this merchant, and be active',
      );
    }

    // Paystack subaccount splitting requires registered subaccounts.
    for (const beneficiary of beneficiaries) {
      if (!beneficiary.paystackSubaccountCode) {
        throw new BadRequestException(
          `${beneficiary.name} has not been registered as a Paystack subaccount`,
        );
      }
    }

    const rule = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.splitRule.findFirst({
        where: { merchantId },
        orderBy: {
          version: 'desc',
        },
      });

      // Deactivate the previous active rule.
      await tx.splitRule.updateMany({
        where: {
          merchantId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.splitRule.create({
        data: {
          merchantId,
          name: dto.name,
          description: dto.description,
          currency: merchant.currency,
          version: (latest?.version ?? 0) + 1,
          isActive: true,
          items: {
            create: dto.items.map((item) => ({
              beneficiaryId: item.beneficiaryId,
              type: item.splitType,
              value: BigInt(item.value),
            })),
          },
        },
        include: {
          items: {
            include: {
              beneficiary: true,
            },
          },
        },
      });
    });

    return this.serializeRule(rule);
  }

  async findAll(merchantId: string) {
    const rules = await this.prisma.splitRule.findMany({
      where: { merchantId },
      include: {
        items: {
          include: {
            beneficiary: true,
          },
        },
      },
      orderBy: {
        version: 'desc',
      },
    });

    return rules.map((rule) => this.serializeRule(rule));
  }

  async findActive(merchantId: string) {
    const rule = await this.prisma.splitRule.findFirst({
      where: {
        merchantId,
        isActive: true,
      },
      include: {
        items: {
          include: {
            beneficiary: true,
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('No active split rule found');
    }

    return this.serializeRule(rule);
  }

  async preview(
    merchantId: string,
    splitRuleId: string,
    amount: number,
  ) {
    if (
      !Number.isSafeInteger(amount) ||
      amount <= 0
    ) {
      throw new BadRequestException(
        'Payment amount must be a positive safe integer',
      );
    }

    const rule = await this.prisma.splitRule.findFirst({
      where: {
        id: splitRuleId,
        merchantId,
      },
      include: {
        items: {
          include: {
            beneficiary: true,
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Split rule not found');
    }

    if (rule.items.length === 0) {
      throw new BadRequestException(
        'Split rule has no allocations',
      );
    }

    const allocations = this.calculator.calculate(
      BigInt(amount),
      rule.items.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiary.name,
        splitType: item.type,
        value: Number(item.value),
      })),
    );

    const allocated = allocations.reduce(
      (sum, item) => sum + item.amount,
      0n,
    );

    const paymentAmount = BigInt(amount);
    const merchantRemainder = paymentAmount - allocated;

    if (merchantRemainder < 0n) {
      throw new BadRequestException(
        'Split allocations exceed the payment amount',
      );
    }

    return {
      splitRuleId: rule.id,
      splitRuleName: rule.name,
      paymentAmount: paymentAmount.toString(),
      allocatedAmount: allocated.toString(),
      merchantRemainder: merchantRemainder.toString(),
      currency: rule.currency,
      allocations: allocations.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiaryName,
        amount: item.amount.toString(),
      })),
    };
  }
}
