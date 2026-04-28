import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';

@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string }) {
    return this.projectsService.create(body);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string }) {
    return this.projectsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
