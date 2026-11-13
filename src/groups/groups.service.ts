import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { PreviewAllocationDto } from './dto/preview-allocation.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroupDto) {
    if (!dto.members?.length) throw new BadRequestException('Add at least one participant.');
    const owner = await this.prisma.user.upsert({
      where: { email: dto.ownerEmail.toLowerCase() },
      update: { name: dto.ownerName },
      create: { email: dto.ownerEmail.toLowerCase(), name: dto.ownerName },
    });

    const people = [{ name: owner.name, email: owner.email }, ...dto.members];
    const unique = new Map(people.map(p => [p.email?.toLowerCase() ?? p.name, p]));
    const members = [...unique.values()];
    const target = BigInt(dto.targetAmount);
    const base = target / BigInt(members.length);
    const remainder = target % BigInt(members.length);

    const group = await this.prisma.paymentGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
        currency: dto.currency,
        targetAmount: target,
        ownerId: owner.id,
        status: 'COLLECTING',
        contributions: {
          create: members.map((person, index) => ({
            contributorName: person.name,
            contributorEmail: person.email?.toLowerCase(),
            amount: base + (BigInt(index) < remainder ? 1n : 0n),
          })),
        },
      },
      include: { contributions: true, recipients: true, allocations: true },
    });
    return this.serializeGroup(group);
  }

  async addRecipient(groupId: string, name: string, description?: string) {
    const group = await this.prisma.paymentGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Group not found');
    return this.prisma.recipient.create({
      data: { groupId, name, description },
    });
  }

  async findAll() {
    const groups = await this.prisma.paymentGroup.findMany({
      orderBy: { createdAt: 'desc' },
      include: { contributions: true, recipients: true },
    });
    return groups.map(g => this.serializeGroup(g));
  }

  async findOne(id: string) {
    const group = await this.prisma.paymentGroup.findUnique({
      where: { id },
      include: { contributions: true, recipients: true, allocations: { include: { recipient: true } } },
    });
    if (!group) throw new NotFoundException('Group not found');
    return this.serializeGroup(group);
  }

  async previewAllocation(id: string, dto: PreviewAllocationDto) {
    const group = await this.prisma.paymentGroup.findUnique({
      where: { id },
      include: { contributions: true, recipients: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    const collected = group.contributions.reduce((sum, c) => sum + c.paidAmount, 0n);
    const allocated = dto.allocations.reduce((sum, a) => sum + BigInt(a.amount), 0n);
    const target = group.targetAmount;

    const recipientIds = new Set(group.recipients.map(r => r.id));
    for (const line of dto.allocations) {
      if (!recipientIds.has(line.recipientId)) throw new BadRequestException('Unknown recipient in allocation.');
    }
    if (allocated !== target) {
      throw new BadRequestException('Allocation total must equal the group funding target.');
    }

    return {
      currency: group.currency,
      targetAmount: target.toString(),
      collectedAmount: collected.toString(),
      allocationTotal: allocated.toString(),
      fullyFunded: collected >= target,
      canDistribute: collected >= target && allocated === target,
      allocations: dto.allocations,
      note: 'Preview only. No money has been transferred.',
    };
  }

  private serializeGroup(group: any) {
    return {
      ...group,
      targetAmount: group.targetAmount.toString(),
      contributions: group.contributions?.map((c: any) => ({
        ...c, amount: c.amount.toString(), paidAmount: c.paidAmount.toString(),
      })),
      allocations: group.allocations?.map((a: any) => ({ ...a, amount: a.amount.toString() })),
    };
  }
}
