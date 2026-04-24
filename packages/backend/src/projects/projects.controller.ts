import { Controller, Get, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.projectsService.findAll(userId);
  }
}
