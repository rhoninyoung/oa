import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service.js';

@Controller('api/statistics')
export class StatisticsController {
  constructor(private readonly statsService: StatisticsService) {}

  @Get('workload')
  async getWorkload(@Query('iterationId') iterationId: string) {
    return this.statsService.getWorkloadStats(iterationId);
  }

  @Get('progress')
  async getProgress(@Query('projectId') projectId: string) {
    return this.statsService.getProjectProgress(projectId);
  }
}
