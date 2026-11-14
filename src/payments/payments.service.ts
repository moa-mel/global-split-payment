
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  LedgerEntryType,
  PayoutStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SplitCalculatorService } from '../split-rules/split-calculator.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreatePaymentDto } from './dtos/create-payment.dto';
import {
  PaymentProvider,
  CheckoutRequest,
  PAYMENT_PROVIDER,
} from './payment-provider.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: SplitCalculatorService,
    private readonly ledger: LedgerService,

    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) { }

  async create(merchantId: string, dto: CreatePaymentDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!dto.customerEmail) {
      throw new BadRequestException(
        'Customer email is required by Paystack',
      );
    }

    if (!Number.isSafeInteger(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException(
        'Payment amount must be a positive integer in the smallest currency unit',
      );
    }

    const rule = dto.splitRuleId
      ? await this.prisma.splitRule.findFirst({
        where: {
          id: dto.splitRuleId,
          merchantId,
        },
        include: {
          items: {
            include: {
              beneficiary: true,
            },
          },
        },
      })
      : await this.prisma.splitRule.findFirst({
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

    if (!rule || rule.items.length === 0) {
      throw new BadRequestException(
        'A valid split rule is required',
      );
    }

    const types = new Set(
      rule.items.map((item) => item.type),
    );

    if (types.size !== 1) {
      throw new BadRequestException(
        'Paystack requires one split type per transaction: percentage or fixed',
      );
    }

    for (const item of rule.items) {
      if (!item.beneficiary.isActive) {
        throw new BadRequestException(
          `${item.beneficiary.name} is inactive`,
        );
      }

      if (!item.beneficiary.paystackSubaccountCode) {
        throw new BadRequestException(
          `${item.beneficiary.name} has not been registered as a Paystack subaccount`,
        );
      }
    }

    const splitType = rule.items[0].type;

    if (splitType === 'PERCENTAGE') {
      const totalBasisPoints = rule.items.reduce(
        (sum, item) => sum + Number(item.value),
        0,
      );

      if (totalBasisPoints > 10000) {
        throw new BadRequestException(
          'Percentage allocations cannot exceed 100%',
        );
      }

      if (
        rule.items.some(
          (item) => Number(item.value) % 100 !== 0,
        )
      ) {
        throw new BadRequestException(
          'Paystack percentage splits must use whole percentages',
        );
      }
    }

    const allocations = this.calculator.calculate(
      BigInt(dto.amount),
      rule.items.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiary.name,
        splitType: item.type,
        value: Number(item.value),
      })),
    );

    const allocatedAmount = allocations.reduce(
      (sum, item) => sum + item.amount,
      0n,
    );

    if (allocatedAmount > BigInt(dto.amount)) {
      throw new BadRequestException(
        'Split allocations exceed payment amount',
      );
    }

    const reference = `sflow_${randomUUID().replace(/-/g, '')}`;

    const payment = await this.prisma.payment.create({
      data: {
        merchantId,
        splitRuleId: rule.id,
        reference,
        amount: BigInt(dto.amount),
        currency: dto.currency.toUpperCase(),
        customerEmail: dto.customerEmail,
        description: dto.description,
        provider: PAYMENT_PROVIDER,
        status: PaymentStatus.PENDING,
      },
    });

    const split = {
      type:
        splitType === 'PERCENTAGE'
          ? ('percentage' as const)
          : ('flat' as const),
      bearer_type: 'account' as const,
      subaccounts: rule.items.map((item) => ({
        subaccount: item.beneficiary.paystackSubaccountCode!,
        share:
          splitType === 'PERCENTAGE'
            ? Number(item.value) / 100
            : Number(item.value),
      })),
    };

    try {
      const checkoutRequest: CheckoutRequest = {
        reference,
        amount: dto.amount,
        currency: dto.currency.toUpperCase(),
        customerEmail: dto.customerEmail,
        description: dto.description,
        split,
      };

      const checkout =
        await this.paymentProvider.createCheckout(checkoutRequest);

      return this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerReference: checkout.providerReference,
          checkoutUrl: checkout.checkoutUrl,
          paystackAccessCode: checkout.accessCode,
        },
      });
    } catch (error) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      throw error;
    }
  }

  async verifyAndConfirm(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const verified =
      await this.paymentProvider.verifyTransaction(reference);

    if (verified.status !== 'success') {
      throw new BadRequestException(
        `Paystack payment status is ${verified.status}`,
      );
    }

    if (BigInt(verified.amount) !== payment.amount) {
      throw new BadRequestException(
        'Verified Paystack amount does not match the payment amount',
      );
    }

    if (
      verified.currency.toUpperCase() !== payment.currency
    ) {
      throw new BadRequestException(
        'Verified Paystack currency does not match the payment currency',
      );
    }

    return this.confirmPayment(reference);
  }

  async confirmPayment(reference: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
      include: {
        splitRule: {
          include: {
            items: {
              include: {
                beneficiary: true,
              },
            },
          },
        },
        distributions: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCESSFUL) {
      return payment;
    }

    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot confirm a payment with status ${payment.status}`,
      );
    }

    if (!payment.splitRule) {
      throw new BadRequestException(
        'Payment has no associated split rule',
      );
    }

    const allocations = this.calculator.calculate(
      payment.amount,
      payment.splitRule.items.map((item) => ({
        beneficiaryId: item.beneficiaryId,
        beneficiaryName: item.beneficiary.name,
        splitType: item.type,
        value: Number(item.value),
      })),
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESSFUL,
          paidAt: new Date(),
        },
      });

      for (const allocation of allocations) {
        const ruleItem = payment.splitRule!.items.find(
          (item) =>
            item.beneficiaryId === allocation.beneficiaryId,
        );

        if (!ruleItem) {
          throw new BadRequestException(
            `Split rule item not found for ${allocation.beneficiaryName}`,
          );
        }

        await tx.distribution.upsert({
          where: {
            paymentId_beneficiaryId: {
              paymentId: payment.id,
              beneficiaryId: allocation.beneficiaryId,
            },
          },
          create: {
            paymentId: payment.id,
            beneficiaryId: allocation.beneficiaryId,
            beneficiaryName: allocation.beneficiaryName,
            amount: allocation.amount,
            currency: payment.currency,
            status: PayoutStatus.PENDING,
            idempotencyKey: `${payment.id}_${allocation.beneficiaryId}`,
          },
          update: {},
        });

        await tx.ledgerEntry.create({
          data: {
            paymentId: payment.id,
            type: LedgerEntryType.SPLIT_ALLOCATED,
            amount: allocation.amount,
            currency: payment.currency,
            description: `Allocation for ${allocation.beneficiaryName}`,
            reference: `${payment.reference}_${allocation.beneficiaryId}`,
          },
        });
      }

      await tx.ledgerEntry.create({
        data: {
          paymentId: payment.id,
          type: LedgerEntryType.PAYMENT_RECEIVED,
          amount: payment.amount,
          currency: payment.currency,
          description: 'Customer payment confirmed',
          reference: payment.reference,
        },
      });

      return updated;
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.payment.findMany({
      where: { merchantId },
      include: {
        distributions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(merchantId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        distributions: {
          include: {
            beneficiary: true,
            payout: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
