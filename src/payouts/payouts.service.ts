
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import {
  LedgerEntryType,
  PayoutStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from '../payments/payment-provider.interface';

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    @Inject(PAYMENT_PROVIDER)
    private readonly provider: PaymentProvider,
  ) { }

  async initiate(merchantId: string, distributionId: string) {
    const distribution = await this.prisma.distribution.findFirst({
      where: {
        id: distributionId,
        payment: {
          merchantId,
          status: 'SUCCESSFUL',
        },
      },
      include: {
        beneficiary: true,
        payment: true,
        payout: true,
      },
    });

    if (!distribution) {
      throw new NotFoundException('Distribution not found');
    }

    if (distribution.payout) {
      throw new BadRequestException(
        'A payout already exists for this split',
      );
    }

    if (distribution.status !== PayoutStatus.PENDING) {
      throw new BadRequestException(
        `Cannot initiate payout for distribution with status ${distribution.status}`,
      );
    }

    const beneficiary = distribution.beneficiary;

    if (!beneficiary.accountNumber || !beneficiary.bankCode) {
      throw new BadRequestException(
        'Beneficiary bank account details are incomplete',
      );
    }

    if (!Number.isSafeInteger(Number(distribution.amount))) {
      throw new BadRequestException(
        'Payout amount exceeds the supported safe integer range',
      );
    }

    const reference = `payout_${randomUUID().replace(/-/g, '')}`;
    const idempotencyKey = `payout_${distribution.id}`;

    // Create the payout record before calling the provider.
    // A unique distributionId and idempotencyKey prevent duplicate payouts.
    const payout = await this.prisma.payout.create({
      data: {
        merchantId,
        beneficiaryId: distribution.beneficiaryId,
        distributionId: distribution.id,
        reference,
        idempotencyKey,
        amount: distribution.amount,
        currency: distribution.currency,
        status: PayoutStatus.PROCESSING,
      },
    });

    try {
      const result = await this.provider.initiateTransfer({
        reference,
        amount: Number(distribution.amount),
        currency: distribution.currency,
        accountNumber: beneficiary.accountNumber,
        bankCode: beneficiary.bankCode,
        beneficiaryName: beneficiary.name,
      });

      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedPayout = await tx.payout.update({
          where: { id: payout.id },
          data: {
            providerReference: result.providerReference,
            status: result.status,
            failureReason:
              result.status === PayoutStatus.FAILED
                ? 'Payment provider reported a failed transfer'
                : null,
          },
        });

        await tx.distribution.update({
          where: { id: distribution.id },
          data: {
            status: result.status,
            providerReference: result.providerReference,
          },
        });

        return updatedPayout;
      });

      if (result.status === PayoutStatus.SUCCESSFUL) {
        await this.ledger.record({
          paymentId: distribution.paymentId,
          type: LedgerEntryType.PAYOUT_COMPLETED,
          amount: distribution.amount,
          currency: distribution.currency,
          description: `Payout to ${beneficiary.name}`,
          reference,
        });
      }

      if (result.status === PayoutStatus.FAILED) {
        await this.ledger.record({
          paymentId: distribution.paymentId,
          type: LedgerEntryType.PAYOUT_FAILED,
          amount: distribution.amount,
          currency: distribution.currency,
          description: `Payout failed for ${beneficiary.name}`,
          reference,
        });
      }

      return updated;
    } catch (error) {
      // Do not assume a network timeout means Paystack did not receive
      // the transfer request. Keep it PROCESSING for reconciliation.
      const message =
        error instanceof Error ? error.message : 'Unknown provider error';

      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.PROCESSING,
          failureReason: message,
        },
      });

      throw error;
    }
  }

  async findAll(merchantId: string) {
    return this.prisma.payout.findMany({
      where: { merchantId },
      include: {
        beneficiary: true,
        distribution: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(merchantId: string, id: string) {
    const payout = await this.prisma.payout.findFirst({
      where: {
        id,
        merchantId,
      },
      include: {
        beneficiary: true,
        distribution: true,
      },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }
}
