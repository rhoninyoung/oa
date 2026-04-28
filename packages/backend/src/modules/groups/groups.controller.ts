import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { GroupsService } from './groups.service.js';

@Controller('api/groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  async findAll() {
    return this.groupsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string }) {
    return this.groupsService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.groupsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
