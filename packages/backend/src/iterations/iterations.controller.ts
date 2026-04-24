import { Controller, Get, Param, Headers, UnauthorizedException, Inject } from '@nestjs/common';
import { SchedulesService } from '../schedules/schedules.service.js';

@Controller('iterations')
export class IterationsController {
  constructor(@Inject(SchedulesService) private readonly schedulesService: SchedulesService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    if (!userId) throw new UnauthorizedException();
    return this.schedulesService.findForIteration(id, userId, 'GROUP_LEADER');
  }
}
