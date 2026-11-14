
import { Injectable } from '@nestjs/common';
import { LedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  record(input: {
    paymentId: string;
    type: LedgerEntryType;
    amount: bigint;
    currency: string;
    description?: string;
    reference: string;
  }) {
    return this.prisma.ledgerEntry.create({
      data: input,
    });
  }

  findForMerchant(merchantId: string) {
    return this.prisma.ledgerEntry.findMany({
      where: {
        payment: { merchantId },
      },
      include: { payment: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
