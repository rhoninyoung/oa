import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service.js';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string; email?: string; role: string; groupId?: string }) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; email?: string; role?: string; groupId?: string }) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
