import {
  Controller, Get, Patch, Post, Param, Body, Headers, HttpException, HttpStatus,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const schedule = await this.schedulesService.findOne(id);
    if (!schedule) throw new HttpException('Schedule not found', HttpStatus.NOT_FOUND);
    return schedule;
  }

  @Patch(':id/draft')
  async saveDraft(
    @Param('id') id: string,
    @Body() body: { tasks: unknown[]; version: number },
    @Headers('x-user-id') userId: string,
  ) {
    const result = await this.schedulesService.saveDraft(id, body.tasks, body.version, userId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'CONFLICT', HttpStatus.CONFLICT);
    }
    return result;
  }

  @Post(':id/submit')
  async submit(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.schedulesService.submit(id, userId);
  }

  @Post(':id/withdraw')
  async withdraw(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.schedulesService.withdraw(id, userId);
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.schedulesService.approve(id, userId);
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Headers('x-user-id') userId: string,
  ) {
    return this.schedulesService.reject(id, userId, body.reason);
  }

  @Post(':id/reschedule')
  async reschedule(@Param('id') id: string, @Headers('x-user-id') userId: string) {
    return this.schedulesService.reschedule(id, userId);
  }
}
