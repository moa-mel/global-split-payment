
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { LedgerEntryType, PayoutStatus } from '@prisma/client';
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
  ) {}

  async initiate(merchantId: string, distributionId: string) {
    const distribution = await this.prisma.distribution.findFirst({
      where: {
        id: distributionId,
        payment: { merchantId, status: 'SUCCEEDED' },
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
      throw new BadRequestException('A payout already exists for this split');
    }

    if (
      !distribution.beneficiary.accountNumber ||
      !distribution.beneficiary.bankCode
    ) {
      throw new BadRequestException(
        'Beneficiary bank account details are incomplete',
      );
    }

    const reference = `payout_${randomUUID().replace(/-/g, '')}`;

    const payout = await this.prisma.payout.create({
      data: {
        merchantId,
        beneficiaryId: distribution.beneficiaryId,
        distributionId: distribution.id,
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
        accountNumber: distribution.beneficiary.accountNumber,
        bankCode: distribution.beneficiary.bankCode,
        beneficiaryName: distribution.beneficiary.name,
      });

      const updated = await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          providerReference: result.providerReference,
          status: result.status,
        },
      });

      await this.prisma.distribution.update({
        where: { id: distribution.id },
        data: { status: result.status },
      });

      if (result.status === PayoutStatus.SUCCEEDED) {
        await this.ledger.record({
          merchantId,
          paymentId: distribution.paymentId,
          type: LedgerEntryType.PAYOUT_COMPLETED,
          amount: distribution.amount,
          currency: distribution.currency,
          description: `Payout to ${distribution.beneficiary.name}`,
          reference,
        });
      }

      return updated;
    } catch (error) {
      await this.prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: PayoutStatus.FAILED,
          failureReason:
            error instanceof Error ? error.message : 'Payout failed',
        },
      });

      await this.prisma.distribution.update({
        where: { id: distribution.id },
        data: { status: PayoutStatus.FAILED },
      });

      throw error;
    }
  }

  async findAll(merchantId: string) {
    return this.prisma.payout.findMany({
      where: { merchantId },
      include: { beneficiary: true, distribution: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(merchantId: string, id: string) {
    const payout = await this.prisma.payout.findFirst({
      where: { id, merchantId },
      include: { beneficiary: true, distribution: true },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    return payout;
  }
}
