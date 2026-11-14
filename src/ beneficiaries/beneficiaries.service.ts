
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiaryDto } from './dtos/create-beneficiary.dto';
import { PaystackService } from '../payments/paystack.service';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async create(dto: CreateBeneficiaryDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchantId },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!dto.accountNumber || !dto.bankCode) {
      throw new BadRequestException(
        'Bank account number and bank code are required',
      );
    }

    // Register the beneficiary's account with Paystack first.
    const subaccount = await this.paystack.createSubaccount({
      businessName: dto.name,
      bankCode: dto.bankCode,
      accountNumber: dto.accountNumber,
      email: dto.email,
    });

    return this.prisma.beneficiary.create({
      data: {
        merchantId: dto.merchantId,
        name: dto.name,
        email: dto.email,
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
        bankName: dto.bankName,
        type: dto.type ?? 'OTHER',
        paystackSubaccountCode: subaccount.subaccount_code,
      },
    });
  }

  async findAll(merchantId: string) {
    return this.prisma.beneficiary.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(merchantId: string, id: string) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id, merchantId },
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    return beneficiary;
  }

  async setActive(
    merchantId: string,
    id: string,
    isActive: boolean,
  ) {
    await this.findOne(merchantId, id);

    return this.prisma.beneficiary.update({
      where: { id },
      data: { isActive },
    });
  }
}
