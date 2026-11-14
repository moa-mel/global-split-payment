
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMerchantDto } from './dtos/create-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMerchantDto) {
    const existing = await this.prisma.merchant.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A merchant with this email already exists');
    }

    return this.prisma.merchant.create({
      data: {
        name: dto.name,
        email: dto.email,
        businessName: dto.businessName,
        currency: dto.currency?.toUpperCase() ?? 'NGN',
      },
    });
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        beneficiaries: true,
        splitRules: {
          where: { isActive: true },
          include: { items: { include: { beneficiary: true } } },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async findAll() {
    return this.prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
