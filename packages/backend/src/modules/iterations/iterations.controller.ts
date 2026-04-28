import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { IterationsService } from './iterations.service.js';

@Controller('api/iterations')
export class IterationsController {
  constructor(private readonly iterationsService: IterationsService) {}

  @Get()
  async findAll(@Query('projectId') projectId?: string) {
    return this.iterationsService.findAll(projectId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.iterationsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { projectId: string; name: string; startDate: string; endDate: string }) {
    return this.iterationsService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; startDate?: string; endDate?: string }) {
    return this.iterationsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.iterationsService.remove(id);
  }
}
