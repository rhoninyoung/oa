import {
  Controller, Get, Post, Patch, Body, Param, Headers, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  private getUserId(headers: Headers) {
    const uid = headers.get('x-user-id') ?? undefined;
    if (!uid) throw new UnauthorizedException();
    return uid;
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.findOne(id, this.getUserId(headers));
  }

  @Patch(':id/draft')
  saveDraft(
    @Param('id') id: string,
    @Body() body: { tasks: unknown[]; version: number },
    @Headers() headers: Headers,
  ) {
    return this.svc.saveDraft(id, body.tasks, body.version, this.getUserId(headers));
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.submit(id, this.getUserId(headers));
  }

  @Post(':id/withdraw')
  withdraw(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.withdraw(id, this.getUserId(headers));
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.approve(id, this.getUserId(headers));
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Headers() headers: Headers,
  ) {
    return this.svc.reject(id, this.getUserId(headers), body.reason);
  }

  @Post(':id/reschedule')
  reschedule(@Param('id') id: string, @Headers() headers: Headers) {
    return this.svc.reschedule(id, this.getUserId(headers));
  }
}
