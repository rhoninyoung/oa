import { Controller, Get, Post, Delete, Param, Body, Headers } from '@nestjs/common';
import { MasterService } from './master.service.js';

@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get(':iterationId')
  async getMasterView(@Param('iterationId') iterationId: string) {
    return this.masterService.getMasterView(iterationId);
  }

  @Post(':iterationId/rows')
  async addMasterRow(
    @Param('iterationId') iterationId: string,
    @Body() body: { scheduleId: string; name: string; ownerId?: string; startDate?: string; endDate?: string; durationDays?: number },
    @Headers('x-user-id') userId: string,
  ) {
    return this.masterService.addMasterRow(iterationId, body, userId);
  }

  @Delete('rows/:taskId')
  async deleteMasterRow(@Param('taskId') taskId: string, @Headers('x-user-id') userId: string) {
    return this.masterService.deleteMasterRow(taskId, userId);
  }
}
