
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  BadGatewayException,
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

  const accountNumber = String(dto.accountNumber ?? '').trim();
  const bankCode = String(dto.bankCode ?? '').trim();

  if (!/^\d{10}$/.test(accountNumber)) {
    throw new BadRequestException(
      'Account number must contain exactly 10 digits',
    );
  }

  if (!bankCode) {
    throw new BadRequestException('Bank code is required');
  }

  // Step 1: Verify the account with Paystack.
  const resolved = await this.paystack.resolveAccount({
    accountNumber,
    bankCode,
  });

  // Step 2: Create the Paystack subaccount.
  const subaccount = await this.paystack.createSubaccount({
    businessName: dto.name,
    bankCode,
    accountNumber,
    email: dto.email,
  });

  if (!subaccount.subaccount_code) {
    throw new BadGatewayException(
      'Paystack did not return a subaccount code',
    );
  }

  // Step 3: Save the verified beneficiary.
  return this.prisma.beneficiary.create({
    data: {
      merchantId: dto.merchantId,
      name: dto.name,
      email: dto.email,
      accountNumber,
      bankCode,
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
