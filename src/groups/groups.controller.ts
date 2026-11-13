import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { PreviewAllocationDto } from './dto/preview-allocation.dto';
import { CreateRecipientDto } from './dto/create-recipient.dto';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(@Body() dto: CreateGroupDto) { return this.groups.create(dto); }

  @Get()
  findAll() { return this.groups.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.groups.findOne(id); }

  @Post(':id/recipients')
  addRecipient(@Param('id') id: string, @Body() dto: CreateRecipientDto) {
    return this.groups.addRecipient(id, dto.name, dto.description);
  }

  @Post(':id/allocations/preview')
  preview(@Param('id') id: string, @Body() dto: PreviewAllocationDto) {
    return this.groups.previewAllocation(id, dto);
  }
}
